const mongoose = require("mongoose");

const applicationStageEventSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "stage_change",
        "interview_scheduled",
        "interview_rescheduled",
        "interview_cancelled",
        "note_added",
        "system",
      ],
      default: "stage_change",
      index: true,
    },
    fromStage: {
      type: String,
      default: null,
    },
    toStage: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: "",
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

applicationStageEventSchema.index({ applicationId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "ApplicationStageEvent",
  applicationStageEventSchema
);