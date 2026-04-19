const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const Application = require("../models/Application");
const ApplicationStageEvent = require("../models/ApplicationStageEvent");
const Interview = require("../models/Interview");
const Job = require("../models/Job");
const Resume = require("../models/Resume");
const User = require("../models/User");
const { enqueueScoringJob } = require("../services/scoringQueueService");
const { sendWorkflowNotification } = require("../services/notificationService");
const { extractResumeText } = require("../services/resumeExtractionService");
const {
  ensureApplicantCandidateProfile,
} = require("../services/applicantProfileService");

const applyToJobSchema = z.object({
  jobId: z.string().min(1),
});

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
    .populate("assignedRecruiter", "name email")
    .populate("assignedHiringManager", "name email");
};

const getApplicantCandidate = async (user) => {
  return ensureApplicantCandidateProfile({
    userId: user.id,
    createdBy: user.id,
    source: "applicant_portal",
  });
};

const getMyProfile = asyncHandler(async (req, res) => {
  const candidate = await getApplicantCandidate(req.user);
  await candidate.populate("latestResumeId");

  const resumes = await Resume.find({ candidateId: candidate._id }).sort({ createdAt: -1 });
  res.json({ candidate, resumes });
});

const listMyApplications = asyncHandler(async (req, res) => {
  const candidate = await getApplicantCandidate(req.user);

  const applications = await populateApplication(
    Application.find({ candidateId: candidate._id, isArchived: false }).sort({ createdAt: -1 })
  );

  const applicationIds = applications.map((app) => app._id);

  const interviews = await Interview.find({
    applicationId: { $in: applicationIds },
    status: { $in: ["scheduled", "rescheduled"] },
  })
    .populate({
      path: "applicationId",
      populate: {
        path: "jobId",
        select: "title department",
      },
    })
    .populate("interviewerId", "name email")
    .sort({ scheduledStartAt: 1 });

  res.json({
    candidate,
    applications,
    interviews,
  });
});

const getMyApplicationById = asyncHandler(async (req, res) => {
  const candidate = await getApplicantCandidate(req.user);

  const application = await populateApplication(
    Application.findOne({
      _id: req.params.applicationId,
      candidateId: candidate._id,
      isArchived: false,
    })
  );

  if (!application) {
    throw new HttpError(404, "Application not found");
  }

  const [stageEvents, interviews] = await Promise.all([
    ApplicationStageEvent.find({ applicationId: application._id })
      .populate("actorId", "name email")
      .sort({ createdAt: -1 }),
    Interview.find({ applicationId: application._id })
      .populate("interviewerId", "name email")
      .sort({ scheduledStartAt: 1 }),
  ]);

  res.json({ application, stageEvents, interviews });
});

const applyToJob = asyncHandler(async (req, res) => {
  const data = applyToJobSchema.parse(req.body);

  const candidate = await getApplicantCandidate(req.user);
  const job = await Job.findOne({ _id: data.jobId, status: "open" });

  if (!job) {
    throw new HttpError(404, "Open job not found");
  }

  const existingApplication = await Application.findOne({
    candidateId: candidate._id,
    jobId: job._id,
    isArchived: false,
  });

  if (existingApplication) {
    throw new HttpError(409, "You already applied for this job");
  }

  const application = await Application.create({
    jobId: job._id,
    candidateId: candidate._id,
    submittedByUserId: req.user.id,
    assignedRecruiter: job.assignedRecruiter || null,
    assignedHiringManager: job.assignedHiringManager || null,
    currentStage: "applied",
    stageChangedAt: new Date(),
  });

  await ApplicationStageEvent.create({
    applicationId: application._id,
    fromStage: null,
    toStage: "applied",
    reason: "Applied via applicant portal",
    actorId: req.user.id,
  });

  if (candidate.latestResumeId) {
    await enqueueScoringJob({
      applicationId: application._id,
      resumeId: candidate.latestResumeId,
    });
  }

  const recipientIds = [job.assignedRecruiter, job.assignedHiringManager]
    .filter(Boolean)
    .map((id) => String(id));

  if (recipientIds.length > 0) {
    const recipients = await User.find({ _id: { $in: recipientIds } }).select("_id email");
    const candidateName = req.user.name || `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() || "Applicant";
    const skillsPreview = (candidate.skills || []).slice(0, 8).join(", ");

    await Promise.all(
      recipients.map((recipient) =>
        sendWorkflowNotification({
          recipientUserId: recipient._id,
          recipientEmail: recipient.email,
          subject: `New applicant: ${candidateName}`,
          text: [
            "A new candidate applied via the applicant portal.",
            `Candidate: ${candidateName}`,
            `Email: ${req.user.email || candidate.email || "-"}`,
            `Role: ${job.title}${job.department ? ` (${job.department})` : ""}`,
            `Experience: ${candidate.experienceYears || 0} years`,
            `Skills: ${skillsPreview || "Not provided"}`,
            `Resume Status: ${candidate.latestResumeId ? "Uploaded" : "Not uploaded"}`,
            `Applied At: ${new Date(application.createdAt).toLocaleString("en-IN")}`,
            `Application ID: ${application._id}`,
          ].join("\n"),
          templateKey: "applicant_submitted_application",
          payload: {
            applicationId: application._id,
            jobId: job._id,
            candidateId: candidate._id,
          },
        })
      )
    );
  }

  const populated = await populateApplication(Application.findById(application._id));

  res.status(201).json({ application: populated });
});

const uploadMyResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, "Resume file is required");
  }

  const candidate = await getApplicantCandidate(req.user);

  const resume = await Resume.create({
    candidateId: candidate._id,
    storagePath: req.file.path,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadStatus: "processing",
    uploadedBy: req.user.id,
  });

  try {
    const extractedText = await extractResumeText({
      storagePath: resume.storagePath,
      mimeType: resume.mimeType,
      originalName: resume.originalName,
    });

    resume.extractedText = extractedText;
    resume.uploadStatus = "processed";
    resume.extractionError = null;
  } catch (error) {
    resume.extractedText = "";
    resume.uploadStatus = "failed";
    resume.extractionError = error.message;
  }

  await resume.save();

  candidate.latestResumeId = resume._id;
  await candidate.save();

  const linkedApplications = await Application.find({
    candidateId: candidate._id,
    isArchived: false,
  });

  for (const application of linkedApplications) {
    await enqueueScoringJob({
      applicationId: application._id,
      resumeId: resume._id,
    });
  }

  res.status(201).json({ resume });
});

module.exports = {
  getMyProfile,
  applyToJob,
  listMyApplications,
  getMyApplicationById,
  uploadMyResume,
};
