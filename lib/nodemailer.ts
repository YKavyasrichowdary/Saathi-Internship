import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

if (process.env.NODE_ENV === "production" && process.env.SMTP_USER) {
  transporter
    .verify()
    .then(() => {
      console.log("✅ Brevo SMTP connection verified");
    })
    .catch((error) => {
      console.error(
        "❌ Brevo SMTP verification failed:",
        error instanceof Error
          ? error.message
          : error
      );
    });
}

export default transporter;