const express = require("express");
const {
  createJob,
  listJobs,
  listPublicJobs,
  getPublicJobById,
  getJobById,
  updateJob,
  updateHiringTeam,
  deleteJob,
} = require("../controllers/jobController");
const { authenticate, authorize } = require("../middlewares/auth");
const { ROLE_KEYS } = require("../config/constants");

const router = express.Router();

router.get("/public", listPublicJobs);
router.get("/public/:jobId", getPublicJobById);

router.use(
  authenticate,
  authorize(
    ROLE_KEYS.ADMIN,
    ROLE_KEYS.RECRUITER,
    ROLE_KEYS.HIRING_MANAGER
  )
);

router.get("/", listJobs);
router.get("/:jobId", getJobById);
router.post("/", authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER), createJob);
router.patch("/:jobId", authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER), updateJob);
router.patch(
  "/:jobId/team",
  authorize(ROLE_KEYS.ADMIN),
  updateHiringTeam
);
router.delete("/:jobId", authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER), deleteJob);

module.exports = router;