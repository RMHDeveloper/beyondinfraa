import nodemailer from "nodemailer";
import { db } from "./db";

// Escapes user-controlled strings before interpolating them into email HTML —
// values like clientName/projectTitle/description come from staff/client-editable
// fields and must not be able to inject markup/links into outbound emails.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getSmtpConfig() {
  const settings = await db.appSetting.findMany({
    where: { key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return {
    host: map.smtp_host || process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(map.smtp_port || process.env.SMTP_PORT || "587"),
    user: map.smtp_user || process.env.SMTP_USER || "",
    pass: map.smtp_pass || process.env.SMTP_PASS || "",
    from: map.smtp_from || process.env.SMTP_FROM || "BeyondInfra <noreply@beyondinfra.com>",
  };
}

function buildTransport(cfg: Awaited<ReturnType<typeof getSmtpConfig>>) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[]
) {
  const cfg = await getSmtpConfig();
  if (!cfg.user || !cfg.pass) {
    console.warn("[mailer] SMTP not configured — skipping email to", to);
    return;
  }
  const transport = buildTransport(cfg);
  await transport.sendMail({ from: cfg.from, to, subject, html, attachments });
}

export async function sendClientPortalLink(to: string, clientName: string, projectTitle: string, linkUrl: string) {
  const safeClientName = escapeHtml(clientName || "there");
  const safeProjectTitle = escapeHtml(projectTitle);
  await sendEmail(
    to,
    `Your BeyondInfra Project Form — ${projectTitle}`,
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Hi ${safeClientName},</h2>
      <p style="color:#555;line-height:1.6">
        Your project form for <strong>${safeProjectTitle}</strong> is ready. Click the button below to access it.
        You'll need to enter your registered mobile number and verify with an OTP.
      </p>
      <a href="${linkUrl}" style="display:inline-block;margin:24px 0;background:#111;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600">
        Open Project Form →
      </a>
      <p style="color:#999;font-size:12px">If the button doesn't work, copy this link: ${linkUrl}</p>
    </div>
    `
  );
}

export async function sendSiteVisitReminder(
  to: string,
  staffName: string,
  visitNumber: string,
  propertyTitle: string,
  location: string | null,
  mapsLink: string | null,
  scheduledAt: Date
) {
  const safeStaffName = escapeHtml(staffName);
  const safePropertyTitle = escapeHtml(propertyTitle);
  const safeVisitNumber = escapeHtml(visitNumber);
  const safeLocation = location ? escapeHtml(location) : null;
  await sendEmail(
    to,
    `Site Visit Today — ${propertyTitle}`,
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:18px;font-weight:700">Hi ${safeStaffName},</h2>
      <p style="color:#555;line-height:1.6">
        You have a site visit scheduled today for <strong>${safePropertyTitle}</strong> (${safeVisitNumber}):
      </p>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;font-weight:600">${scheduledAt.toLocaleString("en-IN", { weekday: "long", hour: "numeric", minute: "2-digit", hour12: true })}</p>
        ${safeLocation ? `<p style="margin:8px 0 0;color:#555">${safeLocation}</p>` : ""}
        ${mapsLink ? `<p style="margin:8px 0 0"><a href="${mapsLink}" style="color:#2563eb">Open location in Google Maps →</a></p>` : ""}
      </div>
    </div>
    `
  );
}

export async function sendFollowUpReminder(
  to: string,
  staffName: string,
  projectTitle: string,
  description: string,
  dueAt: Date
) {
  const safeStaffName = escapeHtml(staffName);
  const safeProjectTitle = escapeHtml(projectTitle);
  const safeDescription = escapeHtml(description);
  await sendEmail(
    to,
    `Follow-up Due — ${projectTitle}`,
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:18px;font-weight:700">Hi ${safeStaffName},</h2>
      <p style="color:#555;line-height:1.6">
        You have a follow-up due for <strong>${safeProjectTitle}</strong>:
      </p>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;font-weight:600">${safeDescription}</p>
        <p style="margin:8px 0 0;color:#888;font-size:13px">Due: ${dueAt.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </div>
    `
  );
}
