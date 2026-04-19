const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    scheduledStartAt: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledEndAt: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    status: {
      type: String,
      enum: ["scheduled", "rescheduled", "cancelled", "completed"],
      default: "scheduled",
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
    meetingProvider: {
      type: String,
      enum: ["google_meet", "manual"],
      default: "google_meet",
    },
    meetingLink: {
      type: String,
      default: "",
    },
    calendarEventId: {
      type: String,
      default: null,
    },
    attendees: {
      type: [String],
      default: [],
    },
    cancelledReason: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

interviewSchema.index({ applicationId: 1, scheduledStartAt: -1 });
interviewSchema.index({ interviewerId: 1, scheduledStartAt: 1 });

module.exports = mongoose.model("Interview", interviewSchema);
