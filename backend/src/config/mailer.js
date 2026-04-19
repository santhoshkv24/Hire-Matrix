const nodemailer = require("nodemailer");
const env = require("./env");

let transporter;
const gmailUser = env.GMAIL_USER || env.SMTP_USER;
const gmailAppPassword = env.GMAIL_APP_PASSWORD || env.SMTP_PASS;

if (gmailUser && gmailAppPassword) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
} else {
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
}

module.exports = transporter;