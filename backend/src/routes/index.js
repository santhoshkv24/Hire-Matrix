const express = require("express");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const jobRoutes = require("./jobRoutes");
const candidateRoutes = require("./candidateRoutes");
const applicationRoutes = require("./applicationRoutes");
const applicantRoutes = require("./applicantRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const exportRoutes = require("./exportRoutes");
const interviewRoutes = require("./interviewRoutes");
const notificationRoutes = require("./notificationRoutes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "hirematrix-backend",
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/jobs", jobRoutes);
router.use("/candidates", candidateRoutes);
router.use("/applications", applicationRoutes);
router.use("/applicant", applicantRoutes);
router.use("/interviews", interviewRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/exports", exportRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;