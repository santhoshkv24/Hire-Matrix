const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const {
  getMyProfile,
  applyToJob,
  listMyApplications,
  getMyApplicationById,
  uploadMyResume,
} = require("../controllers/applicantController");
const { authenticate, authorize } = require("../middlewares/auth");
const { ROLE_KEYS } = require("../config/constants");
const HttpError = require("../utils/httpError");

const router = express.Router();

const resumeDir = path.resolve(process.cwd(), "uploads", "resumes");
fs.mkdirSync(resumeDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, resumeDir);
  },
  filename: (_req, file, cb) => {
    const sanitizedName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (!allowedMime.includes(file.mimetype)) {
      cb(new HttpError(400, "Unsupported resume file type"));
      return;
    }

    cb(null, true);
  },
});

router.use(authenticate, authorize(ROLE_KEYS.APPLICANT));

router.get("/profile", getMyProfile);
router.post("/resume", upload.single("resume"), uploadMyResume);
router.get("/applications", listMyApplications);
router.get("/applications/:applicationId", getMyApplicationById);
router.post("/applications", applyToJob);

module.exports = router;
