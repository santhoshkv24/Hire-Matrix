const Candidate = require("../models/Candidate");
const User = require("../models/User");
const HttpError = require("../utils/httpError");

const ensureApplicantCandidateProfile = async ({
  userId,
  phone,
  experienceYears,
  skills,
  createdBy,
  source = "applicant_portal",
}) => {
  const normalizedUserId = String(userId || "").trim();

  if (!normalizedUserId) {
    throw new HttpError(400, "Applicant user ID is required");
  }

  const user = await User.findById(normalizedUserId).select("_id");
  if (!user) {
    throw new HttpError(404, "Applicant user not found");
  }

  let candidate = await Candidate.findOne({ userId: normalizedUserId });

  if (candidate) {
    let shouldSave = false;

    if (phone !== undefined && !candidate.phone) {
      candidate.phone = phone;
      shouldSave = true;
    }

    if (experienceYears !== undefined && (candidate.experienceYears === null || candidate.experienceYears === undefined)) {
      candidate.experienceYears = experienceYears;
      shouldSave = true;
    }

    if (Array.isArray(skills) && candidate.skills.length === 0) {
      candidate.skills = skills;
      shouldSave = true;
    }

    if (!candidate.source && source) {
      candidate.source = source;
      shouldSave = true;
    }

    if (!candidate.createdBy) {
      candidate.createdBy = createdBy || user._id;
      shouldSave = true;
    }

    if (shouldSave) {
      await candidate.save();
    }

    await candidate.populate("userId", "name email");
    return candidate;
  }

  candidate = await Candidate.create({
    userId: user._id,
    phone: phone || "",
    experienceYears: experienceYears ?? 0,
    skills: Array.isArray(skills) ? skills : [],
    source,
    notes: "",
    createdBy: createdBy || user._id,
  });

  await candidate.populate("userId", "name email");
  return candidate;
};

module.exports = {
  ensureApplicantCandidateProfile,
};
