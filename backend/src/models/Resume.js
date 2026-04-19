const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    extractedText: {
      type: String,
      default: "",
    },
    extractionError: {
      type: String,
      default: null,
    },
    uploadStatus: {
      type: String,
      enum: ["uploaded", "processing", "processed", "failed"],
      default: "uploaded",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

resumeSchema.index({ candidateId: 1, createdAt: -1 });

module.exports = mongoose.model("Resume", resumeSchema);