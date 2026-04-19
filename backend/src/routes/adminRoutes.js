const express = require("express");
const {
  listUsers,
  createUser,
  updateUser,
  getRoleCatalog,
  listTeamMembers,
} = require("../controllers/adminController");
const { authenticate, authorize } = require("../middlewares/auth");
const { ROLE_KEYS } = require("../config/constants");

const router = express.Router();

router.use(authenticate);

router.get("/users", authorize(ROLE_KEYS.ADMIN), listUsers);
router.get("/roles", authorize(ROLE_KEYS.ADMIN), getRoleCatalog);
router.get(
  "/team-members",
  authorize(
    ROLE_KEYS.ADMIN,
    ROLE_KEYS.RECRUITER,
    ROLE_KEYS.HIRING_MANAGER,
    ROLE_KEYS.INTERVIEWER
  ),
  listTeamMembers
);
router.post("/users", authorize(ROLE_KEYS.ADMIN), createUser);
router.patch("/users/:userId", authorize(ROLE_KEYS.ADMIN), updateUser);

module.exports = router;