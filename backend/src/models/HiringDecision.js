const mongoose = require("mongoose");
const { DECISION_STATUSES } = require("../config/constants");

const hiringDecisionSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: DECISION_STATUSES,
      default: "pending",
      index: true,
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
      required: true,
    },
    decidedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HiringDecision", hiringDecisionSchema);