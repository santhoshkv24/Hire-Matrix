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

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleKeys: z.array(z.string()).min(1),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  roleKeys: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
});

const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({}).populate("roles").sort({ createdAt: -1 });
  res.json({ users });
});

const createUser = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "Email already in use");
  }

  const roles = await Role.find({ key: { $in: data.roleKeys } });
  if (roles.length !== data.roleKeys.length) {
    throw new HttpError(400, "One or more roles are invalid");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    roles: roles.map((role) => role._id),
    isActive: data.isActive ?? true,
    createdBy: req.user.id,
  });

  const hasApplicantRole = roles.some((role) => role.key === ROLE_KEYS.APPLICANT);

  if (hasApplicantRole) {
    try {
      await ensureApplicantCandidateProfile({
        userId: user._id,
        createdBy: req.user.id,
        source: "applicant_portal",
      });
    } catch (error) {
      await User.findByIdAndDelete(user._id);
      throw error;
    }
  }

  const populatedUser = await User.findById(user._id).populate("roles");
  res.status(201).json({ user: populatedUser });
});

const updateUser = asyncHandler(async (req, res) => {
  const data = updateUserSchema.parse(req.body);
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (data.name !== undefined) {
    user.name = data.name;
  }

  if (data.isActive !== undefined) {
    user.isActive = data.isActive;
  }

  let effectiveRoles;

  if (data.roleKeys) {
    const roles = await Role.find({ key: { $in: data.roleKeys } });
    if (roles.length !== data.roleKeys.length) {
      throw new HttpError(400, "One or more roles are invalid");
    }
    user.roles = roles.map((role) => role._id);
    effectiveRoles = roles;
  } else {
    effectiveRoles = await Role.find({ _id: { $in: user.roles } });
  }

  await user.save();

  const hasApplicantRole = effectiveRoles.some((role) => role.key === ROLE_KEYS.APPLICANT);

  if (hasApplicantRole) {
    await ensureApplicantCandidateProfile({
      userId: user._id,
      createdBy: req.user.id,
      source: "applicant_portal",
    });
  }

  const updated = await User.findById(user._id).populate("roles");
  res.json({ user: updated });
});

const getRoleCatalog = asyncHandler(async (_req, res) => {
  const roles = await Role.find({ key: { $in: Object.values(ROLE_KEYS) } }).sort({ key: 1 });
  res.json({ roles });
});

const listTeamMembers = asyncHandler(async (_req, res) => {
  const users = await User.find({ isActive: true })
    .populate("roles")
    .sort({ name: 1 });

  const members = users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    roles: user.roles,
  }));

  res.json({ members });
});

module.exports = {
  listUsers,
  createUser,
  updateUser,
  getRoleCatalog,
  listTeamMembers,
};