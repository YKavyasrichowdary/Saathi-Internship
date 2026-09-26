import transporter from "@/lib/nodemailer";

interface SendEmailProps {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailProps) {
  try {
    console.log("📧 Sending email to:", to);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId);

    return info;
  } catch (error) {
    console.error(
      "❌ Email delivery error (bypassing throw to prevent signup crash):",
      error instanceof Error
        ? error.message
        : error
    );

    return null;
  }
}