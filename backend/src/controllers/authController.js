const bcrypt = require("bcryptjs");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const User = require("../models/User");
const Role = require("../models/Role");
const { ROLE_KEYS } = require("../config/constants");
const {
  ensureApplicantCandidateProfile,
} = require("../services/applicantProfileService");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const registerApplicantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  skills: z.array(z.string()).optional(),
});

const buildUserPayload = (user) => {
  return {
    sub: String(user._id),
    roles: user.roles.map((role) => role.key),
    email: user.email,
  };
};

const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email.toLowerCase() }).populate("roles");

  if (!user || !user.isActive) {
    throw new HttpError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new HttpError(401, "Invalid email or password");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const payload = buildUserPayload(user);

  res.json({
    user,
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  });
});

const registerApplicant = asyncHandler(async (req, res) => {
  const data = registerApplicantSchema.parse(req.body);
  const email = data.email.toLowerCase();

  const [existingUser, applicantRole] = await Promise.all([
    User.findOne({ email }),
    Role.findOne({ key: ROLE_KEYS.APPLICANT }),
  ]);

  if (!applicantRole) {
    throw new HttpError(500, "Applicant role is not configured");
  }

  if (existingUser) {
    throw new HttpError(409, "An account already exists for this email");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    name: `${data.firstName} ${data.lastName}`.trim(),
    email,
    passwordHash,
    roles: [applicantRole._id],
    isActive: true,
  });

  try {
    await ensureApplicantCandidateProfile({
      userId: user._id,
      phone: data.phone || "",
      experienceYears: data.experienceYears || 0,
      skills: data.skills || [],
      createdBy: user._id,
      source: "applicant_portal",
    });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }

  const populatedUser = await User.findById(user._id).populate("roles");
  const payload = buildUserPayload({
    _id: user._id,
    email,
    roles: [applicantRole],
  });

  res.status(201).json({
    user: populatedUser,
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate("roles");
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  res.json({ user });
});

const refresh = asyncHandler(async (req, res) => {
  const data = refreshSchema.parse(req.body);
  const payload = verifyRefreshToken(data.refreshToken);

  const user = await User.findById(payload.sub).populate("roles");
  if (!user || !user.isActive) {
    throw new HttpError(401, "Invalid refresh token");
  }

  const nextPayload = buildUserPayload(user);

  res.json({
    accessToken: signAccessToken(nextPayload),
    refreshToken: signRefreshToken(nextPayload),
  });
});

module.exports = {
  login,
  registerApplicant,
  me,
  refresh,
};