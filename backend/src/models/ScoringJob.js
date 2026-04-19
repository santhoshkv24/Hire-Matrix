const mongoose = require("mongoose");

const scoringJobSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    failureReason: {
      type: String,
      default: null,
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    queuedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

scoringJobSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("ScoringJob", scoringJobSchema);