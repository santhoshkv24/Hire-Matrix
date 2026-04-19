const asyncHandler = require("../utils/asyncHandler");
const Job = require("../models/Job");
const Candidate = require("../models/Candidate");
const Application = require("../models/Application");
const Interview = require("../models/Interview");

const getMetrics = asyncHandler(async (_req, res) => {
  const [
    totalJobs,
    openJobs,
    totalCandidates,
    totalApplications,
    hires,
    scheduledInterviews,
    offerStageCount,
    stageCounts,
  ] = await Promise.all([
      Job.countDocuments({}),
      Job.countDocuments({ status: "open" }),
      Candidate.countDocuments({}),
      Application.countDocuments({ isArchived: false }),
      Application.countDocuments({ currentStage: "hired", isArchived: false }),
      Interview.countDocuments({ status: { $in: ["scheduled", "rescheduled"] } }),
      Application.countDocuments({ currentStage: "offer", isArchived: false }),
      Application.aggregate([
        {
          $match: {
            isArchived: false,
          },
        },
        {
          $group: {
            _id: "$currentStage",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  res.json({
    totalJobs,
    openJobs,
    totalCandidates,
    totalApplications,
    hires,
    scheduledInterviews,
    offerStageCount,
    stageCounts,
  });
});

module.exports = {
  getMetrics,
};