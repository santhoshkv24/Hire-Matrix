const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "Remote",
    },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship"],
      default: "full_time",
    },
    description: {
      type: String,
      default: "",
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "cancelled"],
      default: "open",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    targetStartDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

jobSchema.index({ department: 1, status: 1 });

module.exports = mongoose.model("Job", jobSchema);