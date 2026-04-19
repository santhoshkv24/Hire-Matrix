const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    recipientEmail: {
      type: String,
      default: null,
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "in_app"],
      default: "email",
    },
    templateKey: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "skipped", "delivered", "read"],
      default: "queued",
      index: true,
    },
    retries: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientEmail: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);