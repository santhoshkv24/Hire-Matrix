const mailer = require("../config/mailer");
const env = require("../config/env");
const Notification = require("../models/Notification");

const sendInAppNotification = async ({
  recipientUserId,
  recipientEmail = null,
  templateKey,
  payload,
}) => {
  if (!recipientUserId) {
    return null;
  }

  return Notification.create({
    recipientUserId,
    recipientEmail,
    channel: "in_app",
    templateKey,
    payload,
    status: "delivered",
    sentAt: new Date(),
  });
};

const sendEmailNotification = async ({
  recipientEmail,
  recipientUserId = null,
  subject,
  text,
  templateKey,
  payload,
}) => {
  if (!recipientEmail) {
    return null;
  }

  const notification = await Notification.create({
    recipientUserId,
    recipientEmail,
    channel: "email",
    templateKey,
    payload,
    status: "queued",
  });

  try {
    await mailer.sendMail({
      from: env.SMTP_FROM,
      to: recipientEmail,
      subject,
      text,
    });

    notification.status = "sent";
    notification.sentAt = new Date();
    await notification.save();
  } catch (error) {
    notification.status = "failed";
    notification.retries += 1;
    notification.lastError = error.message;
    await notification.save();
  }

  return notification;
};

const sendWorkflowNotification = async ({
  recipientUserId = null,
  recipientEmail = null,
  subject,
  text,
  templateKey,
  payload = {},
  channels = ["in_app", "email"],
}) => {
  const tasks = [];

  if (channels.includes("in_app") && recipientUserId) {
    tasks.push(
      sendInAppNotification({
        recipientUserId,
        recipientEmail,
        templateKey,
        payload,
      })
    );
  }

  if (channels.includes("email") && recipientEmail) {
    tasks.push(
      sendEmailNotification({
        recipientEmail,
        recipientUserId,
        subject,
        text,
        templateKey,
        payload,
      })
    );
  }

  await Promise.all(tasks);
};

module.exports = {
  sendEmailNotification,
  sendInAppNotification,
  sendWorkflowNotification,
};