const nodemailer = require('nodemailer');

/*
 * Sends email through a personal Gmail account — free, no third-party
 * email service needed. Requires two env vars:
 *   EMAIL_USER = your Gmail address
 *   EMAIL_PASS = a 16-character Gmail "App Password" (NOT your normal
 *                Gmail password — Google blocks normal-password SMTP
 *                logins from apps). Generate one at:
 *                https://myaccount.google.com/apppasswords
 *                (requires 2-Step Verification to be turned on first)
 */
let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER / EMAIL_PASS are not set in .env — cannot send email.');
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
};

const sendPasswordResetEmail = async (to, resetUrl) => {
  await getTransporter().sendMail({
    from: `"Govaly" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your Govaly password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #e2136e;">Reset your password</h2>
        <p>We received a request to reset your Govaly account password. Click the button below to choose a new one — this link expires in 30 minutes.</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background:#e2136e;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
        </p>
        <p style="color:#888;font-size:12.5px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p style="color:#888;font-size:12.5px;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });
};

module.exports = { sendPasswordResetEmail };
