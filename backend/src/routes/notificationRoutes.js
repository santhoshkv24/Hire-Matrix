const express = require("express");
const {
  listNotifications,
  markNotificationRead,
} = require("../controllers/notificationController");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", listNotifications);
router.patch("/:notificationId/read", markNotificationRead);

module.exports = router;
