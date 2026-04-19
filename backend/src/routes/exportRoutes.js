const express = require("express");
const { exportApplicationsCsv } = require("../controllers/exportController");
const { authenticate, authorize } = require("../middlewares/auth");
const { ROLE_KEYS } = require("../config/constants");

const router = express.Router();

router.get(
  "/applications.csv",
  authenticate,
  authorize(ROLE_KEYS.ADMIN, ROLE_KEYS.RECRUITER),
  exportApplicationsCsv
);

module.exports = router;