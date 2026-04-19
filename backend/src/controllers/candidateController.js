const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const Candidate = require("../models/Candidate");
const Resume = require("../models/Resume");
const Application = require("../models/Application");
const User = require("../models/User");
const Role = require("../models/Role");
const { ROLE_KEYS } = require("../config/constants");
const { enqueueScoringJob } = require("../services/scoringQueueService");
const { extractResumeText } = require("../services/resumeExtractionService");

const createCandidateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

const updateCandidateSchema = createCandidateSchema.partial();

const splitName = (value = "") => {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" ") || "",
  };
};

const buildFullName = ({ firstName = "", lastName = "" }) => {
  return `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();
};

const ensureApplicantRole = async () => {
  const applicantRole = await Role.findOne({ key: ROLE_KEYS.APPLICANT }).select("_id");
  if (!applicantRole) {
    throw new HttpError(500, "Applicant role is not configured");
  }
  return applicantRole;
};

const ensureUserHasRole = async (user, roleId) => {
  const hasRole = user.roles.some((id) => String(id) === String(roleId));
  if (!hasRole) {
    user.roles.push(roleId);
    await user.save();
  }
};

const createCandidate = asyncHandler(async (req, res) => {
  const data = createCandidateSchema.parse(req.body);
  const normalizedEmail = data.email.toLowerCase();
  const applicantRole = await ensureApplicantRole();

  let user = await User.findOne({ email: normalizedEmail }).select("_id name email roles isActive");

  if (user) {
    const existingCandidate = await Candidate.findOne({ userId: user._id });
    if (existingCandidate) {
      throw new HttpError(409, "Candidate profile already exists for this email");
    }

    await ensureUserHasRole(user, applicantRole._id);
  } else {
    const generatedPassword = crypto.randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    user = await User.create({
      name: buildFullName({ firstName: data.firstName, lastName: data.lastName }) || "Applicant",
      email: normalizedEmail,
      passwordHash,
      roles: [applicantRole._id],
      isActive: true,
      createdBy: req.user.id,
    });
  }

  const nextName = buildFullName({ firstName: data.firstName, lastName: data.lastName });
  if (nextName && user.name !== nextName) {
    user.name = nextName;
    await user.save();
  }

  const candidate = await Candidate.create({
    userId: user._id,
    phone: data.phone || "",
    experienceYears: data.experienceYears || 0,
    source: data.source || "direct",
    notes: data.notes || "",
    skills: data.skills || [],
    createdBy: req.user.id,
  });

  await candidate.populate("userId", "name email");

  res.status(201).json({ candidate });
});

const listCandidates = asyncHandler(async (_req, res) => {
  const candidates = await Candidate.find({})
    .populate("userId", "name email")
    .sort({ createdAt: -1 });
  res.json({ candidates });
});

const getCandidateById = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.candidateId)
    .populate("userId", "name email")
    .populate("latestResumeId");

  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  const resumes = await Resume.find({ candidateId: candidate._id }).sort({ createdAt: -1 });

  const enhancedResumes = resumes.map((resume) => {
    const data = resume.toObject();
    return {
      ...data,
      downloadUrl: `/api/v1/candidates/${candidate._id}/resumes/${resume._id}/download`,
    };
  });

  res.json({ candidate, resumes: enhancedResumes });
});

const updateCandidate = asyncHandler(async (req, res) => {
  const data = updateCandidateSchema.parse(req.body);
  const candidate = await Candidate.findById(req.params.candidateId).populate(
    "userId",
    "_id name email roles"
  );

  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  const user = await User.findById(candidate.userId?._id || candidate.userId).select(
    "_id name email roles"
  );

  if (!user) {
    throw new HttpError(404, "Candidate user not found");
  }

  if (data.email !== undefined) {
    const nextEmail = data.email.toLowerCase();
    if (nextEmail !== user.email) {
      const existingUser = await User.findOne({ email: nextEmail }).select("_id");
      if (existingUser) {
        throw new HttpError(409, "Email already in use");
      }
      user.email = nextEmail;
    }
  }

  if (data.firstName !== undefined || data.lastName !== undefined) {
    const currentName = splitName(user.name);
    const nextName = buildFullName({
      firstName: data.firstName !== undefined ? data.firstName : currentName.firstName,
      lastName: data.lastName !== undefined ? data.lastName : currentName.lastName,
    });

    user.name = nextName || user.name;
  }

  await user.save();

  if (data.phone !== undefined) {
    candidate.phone = data.phone;
  }
  if (data.experienceYears !== undefined) {
    candidate.experienceYears = data.experienceYears;
  }
  if (data.source !== undefined) {
    candidate.source = data.source;
  }
  if (data.notes !== undefined) {
    candidate.notes = data.notes;
  }
  if (data.skills !== undefined) {
    candidate.skills = data.skills;
  }

  await candidate.save();
  await candidate.populate("userId", "name email");

  res.json({ candidate });
});

const deleteCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.candidateId);

  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  const hasApplications = await Application.exists({
    candidateId: candidate._id,
    isArchived: false,
  });
  if (hasApplications) {
    throw new HttpError(
      409,
      "Cannot delete candidate with existing applications. Remove applications first."
    );
  }

  const resumes = await Resume.find({ candidateId: candidate._id });

  await Promise.all([
    Resume.deleteMany({ candidateId: candidate._id }),
    Candidate.findByIdAndDelete(candidate._id),
  ]);

  await Promise.all(
    resumes.map(async (resume) => {
      if (!resume.storagePath) {
        return;
      }

      try {
        await fs.promises.unlink(path.resolve(resume.storagePath));
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.warn("Failed to remove resume file", error.message);
        }
      }
    })
  );

  res.status(204).send();
});

const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, "Resume file is required");
  }

  const candidate = await Candidate.findById(req.params.candidateId);
  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  const resume = await Resume.create({
    candidateId: candidate._id,
    storagePath: req.file.path,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadStatus: "processing",
    uploadedBy: req.user.id,
  });

  try {
    const extractedText = await extractResumeText({
      storagePath: resume.storagePath,
      mimeType: resume.mimeType,
      originalName: resume.originalName,
    });

    resume.extractedText = extractedText;
    resume.uploadStatus = "processed";
    resume.extractionError = null;
  } catch (error) {
    resume.extractedText = "";
    resume.uploadStatus = "failed";
    resume.extractionError = error.message;
  }

  await resume.save();

  candidate.latestResumeId = resume._id;
  await candidate.save();

  const linkedApplications = await Application.find({ candidateId: candidate._id });
  for (const application of linkedApplications) {
    await enqueueScoringJob({
      applicationId: application._id,
      resumeId: resume._id,
    });
  }

  res.status(201).json({ resume });
});

const downloadResume = asyncHandler(async (req, res) => {
  const { candidateId, resumeId } = req.params;

  const [candidate, resume] = await Promise.all([
    Candidate.findById(candidateId),
    Resume.findById(resumeId),
  ]);

  if (!candidate) {
    throw new HttpError(404, "Candidate not found");
  }

  if (!resume || String(resume.candidateId) !== String(candidate._id)) {
    throw new HttpError(404, "Resume not found");
  }

  const resolvedPath = path.resolve(resume.storagePath);

  try {
    await fs.promises.access(resolvedPath, fs.constants.R_OK);
  } catch (_error) {
    throw new HttpError(404, "Stored resume file is missing");
  }

  res.download(resolvedPath, resume.originalName);
});

module.exports = {
  createCandidate,
  listCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  uploadResume,
  downloadResume,
};