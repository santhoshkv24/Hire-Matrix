const mongoose = require("mongoose");
const {
  PIPELINE_STAGES,
  DECISION_STATUSES,
} = require("../config/constants");

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    submittedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    currentStage: {
      type: String,
      enum: PIPELINE_STAGES,
      default: "applied",
      index: true,
    },
    stageChangedAt: {
      type: Date,
      default: Date.now,
    },
    assignedRecruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedHiringManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    score: {
      value: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      strengths: {
        type: [String],
        default: [],
      },
      gaps: {
        type: [String],
        default: [],
      },
      model: {
        type: String,
        default: null,
      },
      status: {
        type: String,
        enum: ["not_started", "queued", "processing", "completed", "failed"],
        default: "not_started",
      },
      error: {
        type: String,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    finalDecision: {
      status: {
        type: String,
        enum: DECISION_STATUSES,
        default: "pending",
      },
      offerStatus: {
        type: String,
        default: "not_started",
      },
      notes: {
        type: String,
        default: "",
      },
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      decidedAt: {
        type: Date,
        default: null,
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

applicationSchema.index(
  { candidateId: 1, jobId: 1, isArchived: 1 },
  {
    unique: true,
    partialFilterExpression: { isArchived: false },
  }
);
applicationSchema.index({ jobId: 1, currentStage: 1, isArchived: 1 });

module.exports = mongoose.model("Application", applicationSchema);