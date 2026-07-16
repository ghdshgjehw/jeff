const { Resend } = require("resend");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const SITE_URL = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function configured() {
  if (!resend) {
    console.warn("[email] Skipped: RESEND_API_KEY is not set.");
    return false;
  }
  return true;
}

/**
 * Notify the admin that a fan sent a message. Only called when no admin
 * dashboard is currently connected, so this doesn't spam an admin who's
 * already watching messages arrive live.
 */
async function sendAdminAlert(fanName, fanEmail, text) {
  if (!configured()) return;
  if (!ADMIN_EMAIL) {
    console.warn("[email] Skipped admin alert: ADMIN_EMAIL is not set.");
    return;
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New message from ${fanName}`,
      text: `${fanName} (${fanEmail}) sent a new message:\n\n"${text}"\n\nReply from the admin dashboard: ${SITE_URL}/admin.html`,
    });
  } catch (err) {
    console.error("[email] Failed to send admin alert:", err.message || err);
  }
}

/**
 * Notify a fan that the admin replied. Only called when that fan has no
 * active connection to the site (i.e. their chat widget isn't open).
 */
async function sendFanAlert(fanEmail, fanName, text) {
  if (!configured()) return;
  if (!fanEmail) return;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: fanEmail,
      subject: "New reply from Jeff Goldblum",
      text: `Hi ${fanName},\n\nYou have a new reply:\n\n"${text}"\n\nContinue the conversation here: ${SITE_URL}`,
    });
  } catch (err) {
    console.error("[email] Failed to send fan alert:", err.message || err);
  }
}

module.exports = { sendAdminAlert, sendFanAlert };