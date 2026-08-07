import nodemailer from "nodemailer";
import { db } from "./db";

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

export async function sendEmail(to: string, subject: string, html: string) {
  const cfg = await getSmtpConfig();
  if (!cfg.user || !cfg.pass) {
    console.warn("[mailer] SMTP not configured — skipping email to", to);
    return;
  }
  const transport = buildTransport(cfg);
  await transport.sendMail({ from: cfg.from, to, subject, html });
}

export async function sendClientPortalLink(to: string, clientName: string, projectTitle: string, linkUrl: string) {
  await sendEmail(
    to,
    `Your BeyondInfra Project Form — ${projectTitle}`,
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Hi ${clientName || "there"},</h2>
      <p style="color:#555;line-height:1.6">
        Your project form for <strong>${projectTitle}</strong> is ready. Click the button below to access it.
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

export async function sendFollowUpReminder(
  to: string,
  staffName: string,
  projectTitle: string,
  description: string,
  dueAt: Date
) {
  await sendEmail(
    to,
    `Follow-up Due — ${projectTitle}`,
    `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
      <h2 style="font-size:18px;font-weight:700">Hi ${staffName},</h2>
      <p style="color:#555;line-height:1.6">
        You have a follow-up due for <strong>${projectTitle}</strong>:
      </p>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;font-weight:600">${description}</p>
        <p style="margin:8px 0 0;color:#888;font-size:13px">Due: ${dueAt.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </div>
    `
  );
}
