const bcrypt = require("bcryptjs");
const Role = require("../models/Role");
const User = require("../models/User");
const { ROLE_KEYS, ROLE_DISPLAY } = require("../config/constants");
const env = require("../config/env");

const ROLE_SEED = [
  {
    key: ROLE_KEYS.ADMIN,
    name: ROLE_DISPLAY[ROLE_KEYS.ADMIN],
    permissions: ["*"],
  },
  {
    key: ROLE_KEYS.RECRUITER,
    name: ROLE_DISPLAY[ROLE_KEYS.RECRUITER],
    permissions: ["job:create", "job:update", "candidate:create", "pipeline:move"],
  },
  {
    key: ROLE_KEYS.HIRING_MANAGER,
    name: ROLE_DISPLAY[ROLE_KEYS.HIRING_MANAGER],
    permissions: ["decision:update", "dashboard:view"],
  },
  {
    key: ROLE_KEYS.INTERVIEWER,
    name: ROLE_DISPLAY[ROLE_KEYS.INTERVIEWER],
    permissions: ["feedback:create"],
  },
  {
    key: ROLE_KEYS.APPLICANT,
    name: ROLE_DISPLAY[ROLE_KEYS.APPLICANT],
    permissions: ["application:submit", "application:track"],
  },
];

const ensureRoles = async () => {
  for (const role of ROLE_SEED) {
    await Role.updateOne({ key: role.key }, { $set: role }, { upsert: true });
  }
};

const ensureDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (existingAdmin) {
    return;
  }

  const adminRole = await Role.findOne({ key: ROLE_KEYS.ADMIN });
  if (!adminRole) {
    throw new Error("Admin role missing during bootstrap");
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await User.create({
    name: "Platform Admin",
    email: env.ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    roles: [adminRole._id],
    isActive: true,
  });

  console.log(`[bootstrap] default admin created: ${env.ADMIN_EMAIL}`);
};

const bootstrapSystem = async () => {
  await ensureRoles();
  await ensureDefaultAdmin();
};

module.exports = {
  bootstrapSystem,
};