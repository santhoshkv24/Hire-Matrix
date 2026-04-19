const Application = require("../models/Application");
const Resume = require("../models/Resume");
const Job = require("../models/Job");
const ScoringJob = require("../models/ScoringJob");
const { scoreResume } = require("./scoringService");
const { extractResumeText } = require("./resumeExtractionService");

const runScoring = async ({ applicationId, resumeId, scoringJobId }) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw new Error("Application not found");
  }

  application.score.status = "processing";
  application.score.error = null;
  application.score.updatedAt = new Date();
  await application.save();

  const scoringJob = await ScoringJob.findById(scoringJobId);
  if (scoringJob) {
    scoringJob.status = "running";
    scoringJob.startedAt = new Date();
    scoringJob.attempts += 1;
    await scoringJob.save();
  }

  const [resume, job] = await Promise.all([
    Resume.findById(resumeId),
    Job.findById(application.jobId),
  ]);

  let resumeText = resume?.extractedText || "";
  let extractionFailureReason = null;

  if (resume && !resumeText && resume.storagePath) {
    try {
      resumeText = await extractResumeText({
        storagePath: resume.storagePath,
        mimeType: resume.mimeType,
        originalName: resume.originalName,
      });

      resume.extractedText = resumeText;
      resume.uploadStatus = "processed";
      resume.extractionError = null;
      await resume.save();
    } catch (error) {
      extractionFailureReason = error.message;
      resume.uploadStatus = "failed";
      resume.extractionError = error.message;
      await resume.save();
    }
  }

  if (!resumeText) {
    throw new Error(
      extractionFailureReason ||
        "Resume text is empty. Upload a text-based PDF, DOCX, or TXT file to score with AI."
    );
  }

  const result = await scoreResume({
    resumeText,
    job,
  });

  application.score = {
    value: result.score,
    strengths: result.strengths,
    gaps: result.gaps,
    model: result.model,
    status: "completed",
    error: null,
    updatedAt: new Date(),
  };
  await application.save();

  if (scoringJob) {
    scoringJob.status = "completed";
    scoringJob.completedAt = new Date();
    scoringJob.providerResponse = result;
    await scoringJob.save();
  }
};

const initScoringQueue = () => {
  console.log("[scoring] in-process scoring enabled");
};

const processScoringInBackground = (payload) => {
  setImmediate(async () => {
    try {
      await runScoring(payload);
    } catch (error) {
      if (payload.scoringJobId) {
        await ScoringJob.findByIdAndUpdate(payload.scoringJobId, {
          status: "failed",
          failureReason: error.message,
        });
      }

      await Application.findByIdAndUpdate(payload.applicationId, {
        "score.status": "failed",
        "score.error": error.message,
        "score.updatedAt": new Date(),
      });
    }
  });
};

const enqueueScoringJob = async ({ applicationId, resumeId }) => {
  const scoringJob = await ScoringJob.create({
    applicationId,
    resumeId,
    status: "queued",
    queuedAt: new Date(),
  });

  await Application.findByIdAndUpdate(applicationId, {
    "score.status": "queued",
    "score.error": null,
    "score.updatedAt": new Date(),
  });

  const payload = {
    applicationId: String(applicationId),
    resumeId: String(resumeId),
    scoringJobId: String(scoringJob._id),
  };

  processScoringInBackground(payload);
  return scoringJob;
};

const closeScoringQueue = async () => {};

module.exports = {
  initScoringQueue,
  enqueueScoringJob,
  closeScoringQueue,
};