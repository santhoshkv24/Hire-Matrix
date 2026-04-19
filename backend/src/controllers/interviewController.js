const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const Application = require("../models/Application");
const ApplicationStageEvent = require("../models/ApplicationStageEvent");
const Candidate = require("../models/Candidate");
const Interview = require("../models/Interview");
const User = require("../models/User");
const { STAGE_TRANSITIONS } = require("../config/constants");
const {
  isCalendarIntegrationEnabled,
  upsertGoogleMeetEvent,
  cancelGoogleCalendarEvent,
} = require("../services/calendarService");
const { sendWorkflowNotification } = require("../services/notificationService");

const createInterviewSchema = z.object({
  applicationId: z.string().min(1),
  interviewerId: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  scheduledEndAt: z.string().datetime(),
  timezone: z.string().optional(),
  notes: z.string().optional(),
});

const updateInterviewSchema = z.object({
  interviewerId: z.string().optional(),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "rescheduled", "cancelled", "completed"]).optional(),
});

const cancelInterviewSchema = z.object({
  reason: z.string().min(1),
});

const listInterviewsQuerySchema = z.object({
  applicationId: z.string().optional(),
  interviewerId: z.string().optional(),
  status: z.enum(["scheduled", "rescheduled", "cancelled", "completed"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const getCandidateFullName = (candidate) => {
  if (!candidate) {
    return "Applicant";
  }

  if (candidate.fullName) {
    return candidate.fullName;
  }

  if (candidate.userId && typeof candidate.userId === "object" && candidate.userId.name) {
    return candidate.userId.name;
  }

  const fullName = `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();
  return fullName || "Applicant";
};

const getCandidateEmail = (candidate) => {
  if (!candidate) {
    return null;
  }

  if (candidate.email) {
    return candidate.email;
  }

  if (candidate.userId && typeof candidate.userId === "object") {
    return candidate.userId.email || null;
  }

  return null;
};

const getCandidateUserId = (candidate) => {
  if (!candidate) {
    return null;
  }

  if (candidate.userId && typeof candidate.userId === "object") {
    return candidate.userId._id || null;
  }

  return candidate.userId || null;
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getJobSummaryFromApplication = (application) => {
  const job = application?.jobId;
  if (!job || typeof job !== "object") {
    return "the selected role";
  }

  const title = job.title || "the selected role";
  return job.department ? `${title} (${job.department})` : title;
};

const populateInterview = (query) => {
  return query
    .populate({
      path: "applicationId",
      populate: [
        {
          path: "candidateId",
          populate: {
            path: "userId",
            select: "name email",
          },
        },
        { path: "jobId", select: "title department" },
      ],
    })
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate("interviewerId", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");
};

const notifyInterviewParticipants = async ({
  interview,
  candidate,
  interviewer,
  subject,
  text,
  templateKey,
  payload,
}) => {
  const tasks = [];

  const candidateEmail = getCandidateEmail(candidate);
  const candidateUserId = getCandidateUserId(candidate);

  if (candidateEmail || candidateUserId) {
    tasks.push(
      sendWorkflowNotification({
        recipientUserId: candidateUserId,
        recipientEmail: candidateEmail,
        subject,
        text,
        templateKey,
        payload,
      })
    );
  }

  if (interviewer?._id) {
    tasks.push(
      sendWorkflowNotification({
        recipientUserId: interviewer._id,
        recipientEmail: interviewer.email || null,
        subject,
        text,
        templateKey,
        payload,
      })
    );
  }

  await Promise.all(tasks);
};

const maybeMoveToInterviewStage = async ({ application, actorId }) => {
  if (application.currentStage === "interview") {
    return;
  }

  const transitions = STAGE_TRANSITIONS[application.currentStage] || [];
  if (!transitions.includes("interview")) {
    return;
  }

  const fromStage = application.currentStage;
  application.currentStage = "interview";
  application.stageChangedAt = new Date();
  await application.save();

  await ApplicationStageEvent.create({
    applicationId: application._id,
    fromStage,
    toStage: "interview",
    reason: "Auto-moved when interview was scheduled",
    actorId,
  });
};

const listInterviews = asyncHandler(async (req, res) => {
  const data = listInterviewsQuerySchema.parse(req.query);
  const filter = {};

  if (data.applicationId) {
    filter.applicationId = data.applicationId;
  }

  if (data.interviewerId) {
    filter.interviewerId = data.interviewerId;
  }

  if (data.status) {
    filter.status = data.status;
  }

  if (data.from || data.to) {
    filter.scheduledStartAt = {};
    if (data.from) {
      filter.scheduledStartAt.$gte = new Date(data.from);
    }
    if (data.to) {
      filter.scheduledStartAt.$lte = new Date(data.to);
    }
  }

  const interviews = await populateInterview(
    Interview.find(filter).sort({ scheduledStartAt: 1 })
  );

  res.json({ interviews });
});

const createInterview = asyncHandler(async (req, res) => {
  const data = createInterviewSchema.parse(req.body);

  const [application, interviewer] = await Promise.all([
    Application.findById(data.applicationId).populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    }).populate("jobId"),
    User.findById(data.interviewerId).select("_id name email isActive"),
  ]);

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  if (application.isArchived) {
    throw new HttpError(400, "Cannot schedule interview for archived application");
  }

  if (!interviewer || !interviewer.isActive) {
    throw new HttpError(400, "Interviewer is not active or not found");
  }

  const candidate = await Candidate.findById(application.candidateId).populate("userId", "name email");
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  const candidateName = getCandidateFullName(candidate);
  const candidateEmail = getCandidateEmail(candidate);
  const jobSummary = getJobSummaryFromApplication(application);

  const startAt = new Date(data.scheduledStartAt);
  const endAt = new Date(data.scheduledEndAt);

  if (endAt <= startAt) {
    throw new HttpError(400, "Interview end time must be after start time");
  }

  let meetingProvider = "manual";
  let meetingLink = "";
  let calendarEventId = null;

  if (isCalendarIntegrationEnabled()) {
    const meetEvent = await upsertGoogleMeetEvent({
      summary: `Interview: ${candidateName} • ${application.jobId?.title || "Role"}`,
      description: data.notes || "Interview scheduled via HireMatrix",
      startAt,
      endAt,
      attendees: [candidateEmail, interviewer.email].filter(Boolean),
    });

    meetingProvider = "google_meet";
    meetingLink = meetEvent.meetingLink;
    calendarEventId = meetEvent.calendarEventId;
  }

  const interview = await Interview.create({
    applicationId: application._id,
    candidateId: candidate._id,
    interviewerId: interviewer._id,
    scheduledStartAt: startAt,
    scheduledEndAt: endAt,
    timezone: data.timezone || "UTC",
    status: "scheduled",
    notes: data.notes || "",
    meetingProvider,
    meetingLink,
    calendarEventId,
    attendees: [candidateEmail, interviewer.email].filter(Boolean),
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });

  await maybeMoveToInterviewStage({ application, actorId: req.user.id });

  await ApplicationStageEvent.create({
    applicationId: application._id,
    eventType: "interview_scheduled",
    fromStage: application.currentStage,
    toStage: application.currentStage,
    reason: `Interview scheduled for ${startAt.toISOString()}`,
    actorId: req.user.id,
  });

  await notifyInterviewParticipants({
    interview,
    candidate,
    interviewer,
    subject: `Interview scheduled: ${jobSummary}`,
    text: [
      "A new interview has been scheduled in HireMatrix.",
      `Candidate: ${candidateName}`,
      `Role: ${jobSummary}`,
      `Interviewer: ${interviewer.name || "Assigned interviewer"}`,
      `Start: ${formatDateTime(startAt)} (${data.timezone || "UTC"})`,
      `End: ${formatDateTime(endAt)} (${data.timezone || "UTC"})`,
      meetingLink ? `Meeting Link: ${meetingLink}` : "Meeting Link: To be shared by the hiring team",
      data.notes ? `Notes: ${data.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    templateKey: "interview_scheduled",
    payload: {
      interviewId: interview._id,
      applicationId: application._id,
      meetingLink,
      scheduledStartAt: startAt.toISOString(),
      scheduledEndAt: endAt.toISOString(),
    },
  });

  const populated = await populateInterview(Interview.findById(interview._id));

  res.status(201).json({ interview: populated });
});

const updateInterview = asyncHandler(async (req, res) => {
  const data = updateInterviewSchema.parse(req.body);

  const interview = await Interview.findById(req.params.interviewId)
    .populate({
      path: "applicationId",
      populate: {
        path: "jobId",
        select: "title department",
      },
    })
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    });

  if (!interview) {
    throw new HttpError(404, "Interview not found");
  }

  const nextInterviewerId = data.interviewerId || String(interview.interviewerId);
  const interviewer = await User.findById(nextInterviewerId).select("_id name email isActive");

  if (!interviewer || !interviewer.isActive) {
    throw new HttpError(400, "Interviewer is not active or not found");
  }

  const candidate = await Candidate.findById(interview.candidateId);
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  await candidate.populate("userId", "name email");
  const candidateName = getCandidateFullName(candidate);
  const candidateEmail = getCandidateEmail(candidate);
  const jobSummary = getJobSummaryFromApplication(interview.applicationId);

  const startAt = data.scheduledStartAt
    ? new Date(data.scheduledStartAt)
    : interview.scheduledStartAt;
  const endAt = data.scheduledEndAt ? new Date(data.scheduledEndAt) : interview.scheduledEndAt;

  if (endAt <= startAt) {
    throw new HttpError(400, "Interview end time must be after start time");
  }

  const scheduleChanged =
    startAt.getTime() !== new Date(interview.scheduledStartAt).getTime() ||
    endAt.getTime() !== new Date(interview.scheduledEndAt).getTime() ||
    String(interviewer._id) !== String(interview.interviewerId);

  let meetingLink = interview.meetingLink || "";
  let calendarEventId = interview.calendarEventId;

  if (isCalendarIntegrationEnabled()) {
    const meetEvent = await upsertGoogleMeetEvent({
      eventId: interview.calendarEventId || null,
      summary: `Interview: ${candidateName}`,
      description: data.notes || interview.notes || "Interview updated via HireMatrix",
      startAt,
      endAt,
      attendees: [candidateEmail, interviewer.email].filter(Boolean),
    });

    meetingLink = meetEvent.meetingLink;
    calendarEventId = meetEvent.calendarEventId;
  }

  interview.interviewerId = interviewer._id;
  interview.scheduledStartAt = startAt;
  interview.scheduledEndAt = endAt;
  interview.timezone = data.timezone || interview.timezone;
  interview.notes = data.notes !== undefined ? data.notes : interview.notes;
  interview.status = data.status || (scheduleChanged ? "rescheduled" : interview.status);
  interview.meetingProvider = isCalendarIntegrationEnabled() ? "google_meet" : interview.meetingProvider;
  interview.meetingLink = meetingLink;
  interview.calendarEventId = calendarEventId;
  interview.attendees = [candidateEmail, interviewer.email].filter(Boolean);
  interview.updatedBy = req.user.id;
  await interview.save();

  if (scheduleChanged) {
    await ApplicationStageEvent.create({
      applicationId: interview.applicationId,
      eventType: "interview_rescheduled",
      fromStage: null,
      toStage: null,
      reason: `Interview rescheduled to ${startAt.toISOString()}`,
      actorId: req.user.id,
    });

    await notifyInterviewParticipants({
      interview,
      candidate,
      interviewer,
      subject: `Interview updated: ${jobSummary}`,
      text: [
        "An interview has been updated in HireMatrix.",
        `Candidate: ${candidateName}`,
        `Role: ${jobSummary}`,
        `Interviewer: ${interviewer.name || "Assigned interviewer"}`,
        `Start: ${formatDateTime(startAt)} (${interview.timezone || "UTC"})`,
        `End: ${formatDateTime(endAt)} (${interview.timezone || "UTC"})`,
        meetingLink ? `Meeting Link: ${meetingLink}` : "Meeting Link: To be shared by the hiring team",
        data.notes ? `Notes: ${data.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      templateKey: "interview_rescheduled",
      payload: {
        interviewId: interview._id,
        applicationId: interview.applicationId,
        meetingLink,
        scheduledStartAt: startAt.toISOString(),
        scheduledEndAt: endAt.toISOString(),
      },
    });
  }

  const populated = await populateInterview(Interview.findById(interview._id));
  res.json({ interview: populated });
});

const cancelInterview = asyncHandler(async (req, res) => {
  const data = cancelInterviewSchema.parse(req.body);

  const interview = await Interview.findById(req.params.interviewId)
    .populate({
      path: "applicationId",
      populate: {
        path: "jobId",
        select: "title department",
      },
    })
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate("interviewerId", "name email");

  if (!interview) {
    throw new HttpError(404, "Interview not found");
  }

  if (interview.status === "cancelled") {
    return res.json({ interview });
  }

  const candidate = await Candidate.findById(interview.candidateId).populate("userId", "name email");
  const candidateName = getCandidateFullName(candidate);
  const jobSummary = getJobSummaryFromApplication(interview.applicationId);

  await cancelGoogleCalendarEvent(interview.calendarEventId);

  interview.status = "cancelled";
  interview.cancelledReason = data.reason;
  interview.updatedBy = req.user.id;
  await interview.save();

  await ApplicationStageEvent.create({
    applicationId: interview.applicationId,
    eventType: "interview_cancelled",
    fromStage: null,
    toStage: null,
    reason: `Interview cancelled: ${data.reason}`,
    actorId: req.user.id,
  });

  await notifyInterviewParticipants({
    interview,
    candidate,
    interviewer: interview.interviewerId,
    subject: `Interview cancelled: ${jobSummary}`,
    text: [
      "An interview has been cancelled in HireMatrix.",
      `Candidate: ${candidateName}`,
      `Role: ${jobSummary}`,
      `Originally Scheduled: ${formatDateTime(interview.scheduledStartAt)} (${interview.timezone || "UTC"})`,
      `Reason: ${data.reason}`,
    ].join("\n"),
    templateKey: "interview_cancelled",
    payload: {
      interviewId: interview._id,
      applicationId: interview.applicationId,
      reason: data.reason,
    },
  });

  res.json({ interview });
});

module.exports = {
  createInterview,
  listInterviews,
  updateInterview,
  cancelInterview,
};
