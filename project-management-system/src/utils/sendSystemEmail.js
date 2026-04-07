const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USERNAME || !EMAIL_PASSWORD) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT, 10),
    secure: parseInt(EMAIL_PORT, 10) === 465,
    auth: {
      user: EMAIL_USERNAME,
      pass: EMAIL_PASSWORD,
    },
  });

  return transporter;
}

async function sendSystemEmail({ to, subject, text, html }) {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    return { skipped: true, reason: "missing-recipient" };
  }

  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.warn("[SystemEmail] Email transport is not configured. Skipping email send.");
    return { skipped: true, reason: "missing-config" };
  }

  return activeTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
    to,
    subject,
    text,
    html,
  });
}

module.exports = sendSystemEmail;
