const express = require("express");
const {
  createApplication,
  listApplications,
  getApplicationById,
  moveStage,
  addFeedback,
  updateDecision,
  listApplicationNotes,
  addApplicationNote,
  archiveApplication,
  deleteApplication,
  getPipelineBoard,
  triggerRescoring,
} = require("../controllers/applicationController");
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

router.get("/", listApplications);
router.get("/board", authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER, ROLE_KEYS.HIRING_MANAGER), getPipelineBoard);
router.get("/:applicationId", getApplicationById);
router.post(
  "/",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER),
  createApplication
);
router.patch(
  "/:applicationId/stage",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER),
  moveStage
);
router.post(
  "/:applicationId/feedback",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.INTERVIEWER, ROLE_KEYS.HIRING_MANAGER),
  addFeedback
);
router.patch(
  "/:applicationId/decision",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.HIRING_MANAGER),
  updateDecision
);
router.get("/:applicationId/notes", listApplicationNotes);
router.post("/:applicationId/notes", addApplicationNote);
router.patch(
  "/:applicationId/archive",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER),
  archiveApplication
);
router.delete(
  "/:applicationId",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER),
  deleteApplication
);
router.post(
  "/:applicationId/score",
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER, ROLE_KEYS.HIRING_MANAGER),
  triggerRescoring
);

module.exports = router;