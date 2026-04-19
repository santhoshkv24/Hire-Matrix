const mongoose = require("mongoose");

const splitName = (value = "") => {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const firstName = parts.shift() || "Applicant";
  const lastName = parts.join(" ") || "";

  return { firstName, lastName };
};

const candidateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      default: "",
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },
    skills: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      default: "direct",
    },
    notes: {
      type: String,
      default: "",
    },
    latestResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

candidateSchema.index({ skills: "text" });

candidateSchema.virtual("email").get(function getEmail() {
  if (this.userId && typeof this.userId === "object" && this.userId.email) {
    return this.userId.email;
  }
  return undefined;
});

candidateSchema.virtual("fullName").get(function getFullName() {
  if (this.userId && typeof this.userId === "object" && this.userId.name) {
    return this.userId.name;
  }
  return "Applicant";
});

candidateSchema.virtual("firstName").get(function getFirstName() {
  const { firstName } = splitName(this.fullName);
  return firstName;
});

candidateSchema.virtual("lastName").get(function getLastName() {
  const { lastName } = splitName(this.fullName);
  return lastName;
});

candidateSchema.set("toJSON", { virtuals: true });
candidateSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Candidate", candidateSchema);