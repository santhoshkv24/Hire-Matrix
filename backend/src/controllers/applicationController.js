const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const Application = require("../models/Application");
const ApplicationNote = require("../models/ApplicationNote");
const ApplicationStageEvent = require("../models/ApplicationStageEvent");
const Candidate = require("../models/Candidate");
const HiringDecision = require("../models/HiringDecision");
const Interview = require("../models/Interview");
const InterviewFeedback = require("../models/InterviewFeedback");
const Job = require("../models/Job");
const Resume = require("../models/Resume");
const ScoringJob = require("../models/ScoringJob");
const User = require("../models/User");
const { PIPELINE_STAGES, STAGE_TRANSITIONS } = require("../config/constants");
const { enqueueScoringJob } = require("../services/scoringQueueService");
const { sendWorkflowNotification } = require("../services/notificationService");

const createApplicationSchema = z.object({
  jobId: z.string().min(1),
  candidateId: z.string().min(1),
  assignedRecruiter: z.string().optional(),
  assignedHiringManager: z.string().optional(),
});

const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "stageChangedAt"]).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  jobId: z.string().optional(),
  currentStage: z.string().optional(),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        return value.toLowerCase() === "true";
      }
      return false;
    }),
});

const moveStageSchema = z.object({
  toStage: z.enum(PIPELINE_STAGES),
  reason: z.string().optional(),
});

const feedbackSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  recommendation: z.enum(["strong_yes", "yes", "neutral", "no"]),
  comments: z.string().optional(),
  interviewDate: z.string().datetime().optional(),
});

const decisionSchema = z.object({
  status: z.enum(["pending", "selected", "rejected"]),
  offerStatus: z.string().optional(),
  notes: z.string().optional(),
});

const noteSchema = z.object({
  body: z.string().min(1).max(4000),
  mentionUserIds: z.array(z.string()).optional(),
});

const DECISION_TO_STAGE = {
  selected: "hired",
  rejected: "rejected",
};

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

const formatStageLabel = (stage) =>
  String(stage || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getJobSummary = (job) => {
  if (!job || typeof job !== "object") {
    return "the selected role";
  }

  const title = job.title || "the selected role";
  return job.department ? `${title} (${job.department})` : title;
};

const populateApplication = (query) => {
  return query
    .populate("jobId")
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate("submittedByUserId", "name email")
    .populate("assignedRecruiter", "name email")
    .populate("assignedHiringManager", "name email")
    .populate("finalDecision.decidedBy", "name email")
    .populate("archivedBy", "name email");
};

const applyJobAssigneeFallback = (application) => {
  if (!application || !application.jobId || typeof application.jobId !== "object") {
    return application;
  }

  if (!application.assignedRecruiter && application.jobId.assignedRecruiter) {
    application.assignedRecruiter = application.jobId.assignedRecruiter;
  }

  if (!application.assignedHiringManager && application.jobId.assignedHiringManager) {
    application.assignedHiringManager = application.jobId.assignedHiringManager;
  }

  return application;
};

const getUniqueAssigneeIds = (application, excludeUserId = null) => {
  const assignees = [application.assignedRecruiter, application.assignedHiringManager]
    .filter(Boolean)
    .map((id) => String(id));

  return assignees.filter((id, index) => {
    if (excludeUserId && id === String(excludeUserId)) {
      return false;
    }
    return assignees.indexOf(id) === index;
  });
};

const notifyInternalAssignees = async ({
  application,
  excludeUserId = null,
  subject,
  text,
  templateKey,
  payload,
}) => {
  const recipientIds = getUniqueAssigneeIds(application, excludeUserId);
  if (recipientIds.length === 0) {
    return;
  }

  const recipients = await User.find({ _id: { $in: recipientIds } }).select("_id email");

  await Promise.all(
    recipients.map((recipient) =>
      sendWorkflowNotification({
        recipientUserId: recipient._id,
        recipientEmail: recipient.email,
        subject,
        text,
        templateKey,
        payload,
      })
    )
  );
};

const notifyCandidate = async ({ candidate, subject, text, templateKey, payload }) => {
  const recipientUserId = getCandidateUserId(candidate);
  const recipientEmail = getCandidateEmail(candidate);

  if (!recipientUserId && !recipientEmail) {
    return;
  }

  await sendWorkflowNotification({
    recipientUserId,
    recipientEmail,
    subject,
    text,
    templateKey,
    payload,
    channels: recipientEmail ? ["in_app", "email"] : ["in_app"],
  });
};

const createApplication = asyncHandler(async (req, res) => {
  const data = createApplicationSchema.parse(req.body);

  const [job, candidate] = await Promise.all([
    Job.findById(data.jobId),
    Candidate.findById(data.candidateId).populate("userId", "name email"),
  ]);

  if (!job) {
    throw new HttpError(404, "Job not found");
  }
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  const exists = await Application.findOne({
    jobId: data.jobId,
    candidateId: data.candidateId,
    isArchived: false,
  });

  if (exists) {
    throw new HttpError(409, "Application already exists for this candidate and job");
  }

  const application = await Application.create({
    ...data,
    submittedByUserId: getCandidateUserId(candidate),
    assignedRecruiter: data.assignedRecruiter || job.assignedRecruiter || null,
    assignedHiringManager: data.assignedHiringManager || job.assignedHiringManager || null,
    currentStage: "applied",
    stageChangedAt: new Date(),
  });

  await ApplicationStageEvent.create({
    applicationId: application._id,
    fromStage: null,
    toStage: "applied",
    reason: "Application created",
    actorId: req.user.id,
  });

  if (candidate.latestResumeId) {
    await enqueueScoringJob({
      applicationId: application._id,
      resumeId: candidate.latestResumeId,
    });
  }

  const candidateName = getCandidateFullName(candidate);

  await notifyInternalAssignees({
    application,
    excludeUserId: req.user.id,
    subject: `New application received: ${candidateName}`,
    text: [
      "A new application has been created in HireMatrix.",
      `Candidate: ${candidateName}`,
      `Role: ${getJobSummary(job)}`,
      "Current Stage: Applied",
      `Created At: ${formatDateTime(application.createdAt)}`,
      `Application ID: ${application._id}`,
      "",
      "Open Applications to review candidate details and next actions.",
    ].join("\n"),
    templateKey: "application_created",
    payload: {
      applicationId: application._id,
      jobId: job._id,
      candidateId: candidate._id,
    },
  });

  const populated = await populateApplication(Application.findById(application._id));
  res.status(201).json({ application: populated });
});

const listApplications = asyncHandler(async (req, res) => {
  const data = listApplicationsQuerySchema.parse(req.query);

  const includeArchived =
    data.includeArchived &&
    req.user.roles.some((role) => ["admin", "recruiter"].includes(role));

  const filter = {
    isArchived: includeArchived ? { $in: [true, false] } : false,
  };

  if (data.jobId) {
    filter.jobId = data.jobId;
  }

  if (data.currentStage) {
    filter.currentStage = data.currentStage;
  }

  if (data.search && data.search.trim()) {
    const searchRegex = new RegExp(data.search.trim(), "i");

    const [users, jobs] = await Promise.all([
      User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select("_id"),
      Job.find({ title: searchRegex }).select("_id"),
    ]);

    const userIds = users.map((item) => item._id);
    const candidates =
      userIds.length > 0
        ? await Candidate.find({ userId: { $in: userIds } }).select("_id")
        : [];

    const candidateIds = candidates.map((item) => item._id);
    const jobIds = jobs.map((item) => item._id);

    if (candidateIds.length === 0 && jobIds.length === 0) {
      filter._id = null;
    } else {
      filter.$or = [];
      if (candidateIds.length > 0) {
        filter.$or.push({ candidateId: { $in: candidateIds } });
      }
      if (jobIds.length > 0) {
        filter.$or.push({ jobId: { $in: jobIds } });
      }
    }
  }

  const sort = {
    [data.sortBy]: data.sortDir === "asc" ? 1 : -1,
  };

  const skip = (data.page - 1) * data.limit;

  const [applications, total] = await Promise.all([
    populateApplication(Application.find(filter).sort(sort).skip(skip).limit(data.limit)),
    Application.countDocuments(filter),
  ]);

  const normalizedApplications = applications.map((application) =>
    applyJobAssigneeFallback(application)
  );

  res.json({
    applications: normalizedApplications,
    pagination: {
      page: data.page,
      limit: data.limit,
      total,
      pages: Math.ceil(total / data.limit),
    },
  });
});

const getApplicationById = asyncHandler(async (req, res) => {
  const application = await populateApplication(
    Application.findById(req.params.applicationId)
  );

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  applyJobAssigneeFallback(application);

  const [stageEvents, feedback, decision, notes, interviews] = await Promise.all([
    ApplicationStageEvent.find({ applicationId: application._id })
      .populate("actorId", "name email")
      .sort({ createdAt: -1 }),
    InterviewFeedback.find({ applicationId: application._id })
      .populate("interviewerId", "name email")
      .sort({ createdAt: -1 }),
    HiringDecision.findOne({ applicationId: application._id }).populate(
      "decidedBy",
      "name email"
    ),
    ApplicationNote.find({ applicationId: application._id })
      .populate("authorId", "name email")
      .populate("mentionUserIds", "name email")
      .sort({ createdAt: -1 }),
    Interview.find({ applicationId: application._id })
      .populate("interviewerId", "name email")
      .sort({ scheduledStartAt: 1 }),
  ]);

  res.json({ application, stageEvents, feedback, decision, notes, interviews });
});

const moveStage = asyncHandler(async (req, res) => {
  const data = moveStageSchema.parse(req.body);
  const application = await Application.findById(req.params.applicationId)
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate("jobId", "title department");

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  if (application.isArchived) {
    throw new HttpError(400, "Cannot move stage for an archived application");
  }

  const allowedTransitions = STAGE_TRANSITIONS[application.currentStage] || [];
  if (!allowedTransitions.includes(data.toStage)) {
    throw new HttpError(
      400,
      `Invalid stage transition from ${application.currentStage} to ${data.toStage}`
    );
  }

  const fromStage = application.currentStage;
  application.currentStage = data.toStage;
  application.stageChangedAt = new Date();
  await application.save();

  const candidateName = getCandidateFullName(application.candidateId);
  const jobSummary = getJobSummary(application.jobId);
  const reasonLine = data.reason ? `Reason: ${data.reason}` : null;

  await ApplicationStageEvent.create({
    applicationId: application._id,
    fromStage,
    toStage: data.toStage,
    reason: data.reason || "Stage moved",
    actorId: req.user.id,
  });

  await notifyCandidate({
    candidate: application.candidateId,
    subject: `Application update: ${jobSummary}`,
    text: [
      `Hi ${candidateName},`,
      "",
      `Your application for ${jobSummary} has moved from ${formatStageLabel(fromStage)} to ${formatStageLabel(data.toStage)}.`,
      `Updated At: ${formatDateTime(application.stageChangedAt)}`,
      reasonLine,
      "",
      "Log in to HireMatrix to review details and next steps.",
    ]
      .filter(Boolean)
      .join("\n"),
    templateKey: "application_stage_changed",
    payload: {
      applicationId: application._id,
      fromStage,
      toStage: data.toStage,
    },
  });

  await notifyInternalAssignees({
    application,
    excludeUserId: req.user.id,
    subject: `Stage updated: ${candidateName} → ${formatStageLabel(data.toStage)}`,
    text: [
      "An application stage has been updated.",
      `Candidate: ${candidateName}`,
      `Role: ${jobSummary}`,
      `Stage Change: ${formatStageLabel(fromStage)} → ${formatStageLabel(data.toStage)}`,
      `Updated At: ${formatDateTime(application.stageChangedAt)}`,
      reasonLine,
      `Application ID: ${application._id}`,
    ]
      .filter(Boolean)
      .join("\n"),
    templateKey: "application_stage_changed_internal",
    payload: {
      applicationId: application._id,
      fromStage,
      toStage: data.toStage,
    },
  });

  res.json({ application });
});

const addFeedback = asyncHandler(async (req, res) => {
  const data = feedbackSchema.parse(req.body);

  const application = await Application.findById(req.params.applicationId)
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate("jobId", "title department");
  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  if (application.isArchived) {
    throw new HttpError(400, "Cannot add feedback for an archived application");
  }

  const feedback = await InterviewFeedback.create({
    applicationId: application._id,
    interviewerId: req.user.id,
    rating: data.rating,
    recommendation: data.recommendation,
    comments: data.comments || "",
    interviewDate: data.interviewDate ? new Date(data.interviewDate) : new Date(),
  });

  const candidateName = getCandidateFullName(application.candidateId);
  const jobSummary = getJobSummary(application.jobId);

  await notifyInternalAssignees({
    application,
    excludeUserId: req.user.id,
    subject: `Interview feedback submitted: ${candidateName}`,
    text: [
      "New interview feedback is available.",
      `Candidate: ${candidateName}`,
      `Role: ${jobSummary}`,
      `Rating: ${feedback.rating}/5`,
      `Recommendation: ${String(feedback.recommendation || "").replace(/_/g, " ")}`,
      `Submitted At: ${formatDateTime(feedback.createdAt)}`,
      `Application ID: ${application._id}`,
    ].join("\n"),
    templateKey: "interview_feedback_added",
    payload: {
      applicationId: application._id,
      feedbackId: feedback._id,
    },
  });

  res.status(201).json({ feedback });
});

const updateDecision = asyncHandler(async (req, res) => {
  const data = decisionSchema.parse(req.body);
  const decidedAt = new Date();

  const application = await Application.findById(req.params.applicationId)
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate("jobId", "title department");
  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  if (application.isArchived) {
    throw new HttpError(400, "Cannot update decision for an archived application");
  }

  const offerStatus =
    data.status === "selected" ? data.offerStatus || "not_started" : "not_started";

  const decision = await HiringDecision.findOneAndUpdate(
    { applicationId: application._id },
    {
      status: data.status,
      offerStatus,
      notes: data.notes || "",
      decidedBy: req.user.id,
      decidedAt,
    },
    { new: true, upsert: true, runValidators: true }
  );

  application.finalDecision = {
    status: data.status,
    offerStatus,
    notes: data.notes || "",
    decidedBy: req.user.id,
    decidedAt,
  };

  const nextStage = DECISION_TO_STAGE[data.status];
  let stageEvent = null;

  if (nextStage && application.currentStage !== nextStage) {
    stageEvent = {
      fromStage: application.currentStage,
      toStage: nextStage,
    };
    application.currentStage = nextStage;
    application.stageChangedAt = decidedAt;
  }

  await application.save();

  if (stageEvent) {
    await ApplicationStageEvent.create({
      applicationId: application._id,
      fromStage: stageEvent.fromStage,
      toStage: stageEvent.toStage,
      reason: `Auto-moved from decision status: ${data.status}`,
      actorId: req.user.id,
    });
  }

  const candidateName = getCandidateFullName(application.candidateId);
  const jobSummary = getJobSummary(application.jobId);
  const offerStatusLine =
    data.status === "selected" && offerStatus !== "not_started"
      ? `Offer Status: ${formatStageLabel(offerStatus)}`
      : null;
  const decisionNotesLine = data.notes ? `Notes: ${data.notes}` : null;
  const stageChangeLine = stageEvent
    ? `Stage Change: ${formatStageLabel(stageEvent.fromStage)} → ${formatStageLabel(stageEvent.toStage)}`
    : null;

  await notifyCandidate({
    candidate: application.candidateId,
    subject: `Hiring decision update: ${jobSummary}`,
    text: [
      `Hi ${candidateName},`,
      "",
      `There is an update on your application for ${jobSummary}.`,
      `Decision Status: ${formatStageLabel(data.status)}`,
      offerStatusLine,
      stageChangeLine,
      `Updated At: ${formatDateTime(decidedAt)}`,
      decisionNotesLine,
      "",
      "Please sign in to HireMatrix to view full details.",
    ]
      .filter(Boolean)
      .join("\n"),
    templateKey: "hiring_decision_changed",
    payload: {
      applicationId: application._id,
      status: data.status,
      offerStatus,
    },
  });

  await notifyInternalAssignees({
    application,
    excludeUserId: req.user.id,
    subject: `Decision updated: ${candidateName} (${formatStageLabel(data.status)})`,
    text: [
      "A hiring decision has been updated.",
      `Candidate: ${candidateName}`,
      `Role: ${jobSummary}`,
      `Decision Status: ${formatStageLabel(data.status)}`,
      offerStatusLine,
      stageChangeLine,
      `Updated At: ${formatDateTime(decidedAt)}`,
      decisionNotesLine,
      `Application ID: ${application._id}`,
    ]
      .filter(Boolean)
      .join("\n"),
    templateKey: "hiring_decision_changed_internal",
    payload: {
      applicationId: application._id,
      status: data.status,
      offerStatus,
    },
  });

  res.json({ decision, application });
});

const listApplicationNotes = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.applicationId);
  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  const notes = await ApplicationNote.find({ applicationId: application._id })
    .populate("authorId", "name email")
    .populate("mentionUserIds", "name email")
    .sort({ createdAt: -1 });

  res.json({ notes });
});

const addApplicationNote = asyncHandler(async (req, res) => {
  const data = noteSchema.parse(req.body);

  const application = await Application.findById(req.params.applicationId).populate({
    path: "candidateId",
    populate: {
      path: "userId",
      select: "name email",
    },
  });

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  if (application.isArchived) {
    throw new HttpError(400, "Cannot add note to an archived application");
  }

  const note = await ApplicationNote.create({
    applicationId: application._id,
    authorId: req.user.id,
    body: data.body,
    mentionUserIds: data.mentionUserIds || [],
  });

  await ApplicationStageEvent.create({
    applicationId: application._id,
    eventType: "note_added",
    fromStage: application.currentStage,
    toStage: application.currentStage,
    reason: data.body.slice(0, 200),
    actorId: req.user.id,
  });

  const populatedNote = await ApplicationNote.findById(note._id)
    .populate("authorId", "name email")
    .populate("mentionUserIds", "name email");

  if (data.mentionUserIds?.length) {
    const mentionRecipients = await User.find({
      _id: { $in: data.mentionUserIds },
      isActive: true,
    }).select("_id email");

    await Promise.all(
      mentionRecipients.map((recipient) =>
        sendWorkflowNotification({
          recipientUserId: recipient._id,
          recipientEmail: recipient.email,
          subject: "You were mentioned on an application note",
          text: [
            "A teammate mentioned you on an application note.",
            `Application ID: ${application._id}`,
            `Comment Preview: ${data.body.slice(0, 220)}`,
            `Mentioned At: ${formatDateTime(note.createdAt)}`,
          ].join("\n"),
          templateKey: "application_note_mention",
          payload: {
            applicationId: application._id,
            noteId: note._id,
          },
        })
      )
    );
  }

  res.status(201).json({ note: populatedNote });
});

const archiveApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.applicationId)
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate("jobId", "title department");

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  if (application.isArchived) {
    return res.json({ application });
  }

  application.isArchived = true;
  application.archivedAt = new Date();
  application.archivedBy = req.user.id;
  await application.save();

  const candidateName = getCandidateFullName(application.candidateId);
  const jobSummary = getJobSummary(application.jobId);

  await notifyInternalAssignees({
    application,
    excludeUserId: req.user.id,
    subject: `Application archived: ${candidateName}`,
    text: [
      "An application has been archived.",
      `Candidate: ${candidateName}`,
      `Role: ${jobSummary}`,
      `Archived At: ${formatDateTime(application.archivedAt)}`,
      `Application ID: ${application._id}`,
    ].join("\n"),
    templateKey: "application_archived",
    payload: {
      applicationId: application._id,
    },
  });

  res.json({ application });
});

const deleteApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.applicationId);

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  await Promise.all([
    ApplicationStageEvent.deleteMany({ applicationId: application._id }),
    InterviewFeedback.deleteMany({ applicationId: application._id }),
    HiringDecision.deleteMany({ applicationId: application._id }),
    ScoringJob.deleteMany({ applicationId: application._id }),
    ApplicationNote.deleteMany({ applicationId: application._id }),
    Interview.deleteMany({ applicationId: application._id }),
    Application.findByIdAndDelete(application._id),
  ]);

  res.status(204).send();
});

const getPipelineBoard = asyncHandler(async (req, res) => {
  const filter = {
    isArchived: false,
  };
  if (req.query.jobId) {
    filter.jobId = req.query.jobId;
  }

  const applications = await populateApplication(
    Application.find(filter).sort({ updatedAt: -1 })
  );

  const board = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = [];
    return acc;
  }, {});

  for (const application of applications) {
    board[application.currentStage].push(application);
  }

  res.json({ board, stages: PIPELINE_STAGES });
});

const triggerRescoring = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.applicationId);
  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  if (application.isArchived) {
    throw new HttpError(400, "Cannot re-score an archived application");
  }

  const resume = await Resume.findOne({ candidateId: application.candidateId }).sort({ createdAt: -1 });
  if (!resume) {
    throw new HttpError(404, "No resume found for candidate");
  }

  const scoringJob = await enqueueScoringJob({
    applicationId: application._id,
    resumeId: resume._id,
  });

  res.status(202).json({ scoringJob });
});

module.exports = {
  createApplication,
  listApplications,
  getApplicationById,
  moveStage,
  addFeedback,
  updateDecision,
  listApplicationNotes,
  addApplicationNote,
  archiveApplication,
  deleteApplication,
  getPipelineBoard,
  triggerRescoring,
};