// ============================================================================
// Mailer
// Sends the "reset your password" email for self-service password reset
// (see requestPasswordReset/resetPassword in authController.js).
//
// Requires SMTP settings in .env: SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS, SMTP_FROM. Until those are set, sends are NOT silently
// skipped like Web Push is — a missing/invalid email is the one way a
// person can get permanently locked out of their account, so
// requestPasswordReset surfaces a clear "email isn't set up" error to the
// Admin instead of pretending it worked. In development, when SMTP host
// is unset, the reset link is logged to the console instead, so the flow
// is still testable without real SMTP credentials.
// ============================================================================

const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "Salon System <no-reply@salonsystem.local>";

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

/**
 * sendPasswordResetEmail({ to, firstName, resetUrl })
 * Returns { sent: boolean, devLogged: boolean }. Throws only on a genuine
 * SMTP failure when configured — callers should surface that to the
 * Admin, since a failed send here means the employee has no way to
 * self-reset until it's retried.
 */
async function sendPasswordResetEmail({ to, firstName, resetUrl }) {
  const subject = "Reset your Salon System password";
  const text = `Hi ${firstName},\n\nSomeone requested a password reset for your Salon System account. If this was you, set a new password here (this link works once and expires in 30 minutes):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password won't change.`;
  const html = `
    <p>Hi ${firstName},</p>
    <p>Someone requested a password reset for your Salon System account. If this was you, set a new password using the button below. This link works once and expires in <strong>30 minutes</strong>.</p>
    <p><a href="${resetUrl}" style="display:inline-block;background:#8a4a2f;color:#fdf9f2;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Reset password</a></p>
    <p style="color:#777;font-size:12px;">If the button doesn't work, copy this link: ${resetUrl}</p>
    <p style="color:#777;font-size:12px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
  `;

  if (!isConfigured) {
    // Dev-mode fallback: no SMTP set up, so log the link instead of
    // failing outright — lets the whole flow be exercised locally.
    console.log(`[mailer] SMTP not configured — password reset link for ${to}:\n${resetUrl}`);
    return { sent: false, devLogged: true };
  }

  await transporter.sendMail({ from: SMTP_FROM, to, subject, text, html });
  return { sent: true, devLogged: false };
}

module.exports = { sendPasswordResetEmail, isConfigured };
