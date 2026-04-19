const express = require("express");
const {
  createInterview,
  listInterviews,
  updateInterview,
  cancelInterview,
} = require("../controllers/interviewController");
const { authenticate, authorize } = require("../middlewares/auth");
const { ROLE_KEYS } = require("../config/constants");

const router = express.Router();

router.use(
  authenticate,
  authorize(
    ROLE_KEYS.ADMIN,
    ROLE_KEYS.RECRUITER,
    ROLE_KEYS.HIRING_MANAGER,
    ROLE_KEYS.INTERVIEWER
  )
);

router.get("/", listInterviews);
router.post(
  "/",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER, ROLE_KEYS.HIRING_MANAGER),
  createInterview
);
router.patch(
  "/:interviewId",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER, ROLE_KEYS.HIRING_MANAGER),
  updateInterview
);
router.patch(
  "/:interviewId/cancel",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER, ROLE_KEYS.HIRING_MANAGER),
  cancelInterview
);

module.exports = router;
