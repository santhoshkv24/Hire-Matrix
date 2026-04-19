const mongoose = require("mongoose");

const interviewFeedbackSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    recommendation: {
      type: String,
      enum: ["strong_yes", "yes", "neutral", "no"],
      required: true,
    },
    comments: {
      type: String,
      default: "",
    },
    interviewDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

interviewFeedbackSchema.index({ applicationId: 1, createdAt: -1 });

module.exports = mongoose.model("InterviewFeedback", interviewFeedbackSchema);