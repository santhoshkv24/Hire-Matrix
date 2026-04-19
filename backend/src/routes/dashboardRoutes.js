const express = require("express");
const { getMetrics } = require("../controllers/dashboardController");
const { authenticate, authorize } = require("../middlewares/auth");
const { ROLE_KEYS } = require("../config/constants");

const router = express.Router();

router.get(
  "/metrics",
  authenticate,
  authorize(
    ROLE_KEYS.ADMIN,
    ROLE_KEYS.RECRUITER,
    ROLE_KEYS.HIRING_MANAGER
  ),
  getMetrics
);

module.exports = router;