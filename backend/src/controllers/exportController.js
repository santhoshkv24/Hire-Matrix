const asyncHandler = require("../utils/asyncHandler");
const Application = require("../models/Application");

const escapeCsv = (value) => {
  const raw = value === null || value === undefined ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
};

const exportApplicationsCsv = asyncHandler(async (req, res) => {
  const filter = {
    isArchived: false,
  };
  if (req.query.jobId) {
    filter.jobId = req.query.jobId;
  }
  if (req.query.currentStage) {
    filter.currentStage = req.query.currentStage;
  }

  const applications = await Application.find(filter)
    .populate({
      path: "candidateId",
      populate: {
        path: "userId",
        select: "name email",
      },
    })
    .populate("jobId")
    .sort({ createdAt: -1 });

  const headers = [
    "applicationId",
    "candidateName",
    "candidateEmail",
    "jobTitle",
    "currentStage",
    "score",
    "decisionStatus",
    "createdAt",
  ];

  const rows = applications.map((app) => {
    return [
      app._id,
      `${app.candidateId?.firstName || ""} ${app.candidateId?.lastName || ""}`.trim(),
      app.candidateId?.email || "",
      app.jobId?.title || "",
      app.currentStage,
      app.score?.value ?? "",
      app.finalDecision?.status || "pending",
      app.createdAt.toISOString(),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=applications.csv");
  res.status(200).send(csv);
});

module.exports = {
  exportApplicationsCsv,
};