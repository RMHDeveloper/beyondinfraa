import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { templateSlotDataUri, addFieldSlides, type PptExportConfig } from "@/lib/pptTemplate";
import { sendEmail, escapeHtml } from "@/lib/mailer";
import PptxGenJS from "pptxgenjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST — send (or resend) a previously-exported bulk PPT to the client by email.
// Regenerates the deck from the EXPORT audit row's saved property list (the pptx
// itself is never persisted), attaches it, and records the outcome both on that
// EXPORT row's `meta.email` (read by the UI for the status badge) and as its own
// EMAIL_SENT audit row (full send history, including past errors).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id: demandProjectId } = await params;
  const { auditLogId, to, subject, body } = await req.json() as {
    auditLogId: string; to: string; subject: string; body: string;
  };

  if (!auditLogId || !to || !subject || !body) return apiError("auditLogId, to, subject and body are required");

  const exportLog = await db.auditLog.findUnique({ where: { id: auditLogId } });
  if (!exportLog || exportLog.projectId !== demandProjectId || exportLog.action !== "EXPORT") {
    return apiError("Export not found", 404);
  }

  const demandProject = await db.project.findUnique({ where: { id: demandProjectId }, select: { id: true, title: true } });
  if (!demandProject) return apiError("Not found", 404);

  const exportMeta = exportLog.meta as { properties?: { id: string }[] } | null;
  const exportedProperties = exportMeta?.properties ?? [];
  const projectIds = exportedProperties.map((p) => p.id);
  if (projectIds.length === 0) return apiError("This export has no properties to send");

  const properties = await db.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true, title: true, projectNumber: true, pptExportConfig: true,
      template: {
        select: {
          groups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, sortOrder: true,
              group: {
                select: {
                  id: true, name: true,
                  questions: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, label: true, fieldType: true, isInternal: true, isRequired: true, showInPptExport: true },
                  },
                },
              },
            },
          },
        },
      },
      responses: { select: { questionId: true, value: true } },
    },
  });
  const byId = new Map(properties.map((p) => [p.id, p]));
  const orderedProperties = projectIds.map((pid) => byId.get(pid)).filter((p): p is NonNullable<typeof p> => !!p);

  async function logAttempt(status: "sent" | "error", error?: string) {
    const email = { status, to, subject, sentAt: new Date().toISOString(), ...(error ? { error } : {}) };
    await db.auditLog.update({
      where: { id: auditLogId },
      data: { meta: { ...(exportMeta as object ?? {}), email } },
    });
    await db.auditLog.create({
      data: {
        projectId: demandProjectId,
        userId: session.id,
        action: "EMAIL_SENT",
        entityType: "bulk_ppt",
        meta: { to, subject, status, ...(error ? { error } : {}) },
      },
    });
  }

  if (orderedProperties.length === 0) {
    await logAttempt("error", "None of the originally exported properties could be found");
    return apiError("None of the originally exported properties could be found");
  }

  try {
    const [coverDataUri, thankYouDataUri, middleDataUri] = await Promise.all([
      templateSlotDataUri("cover"),
      templateSlotDataUri("thankyou"),
      templateSlotDataUri("middle"),
    ]);

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "BeyondInfra";
    pptx.company = "BeyondInfra";
    pptx.title = `Properties for ${demandProject.title}`;

    {
      const slide = pptx.addSlide();
      slide.background = { data: coverDataUri };
    }

    for (const p of orderedProperties) {
      const responseMap = Object.fromEntries(p.responses.map((r) => [r.questionId, r.value ?? ""]));
      await addFieldSlides(pptx, p.template.groups, responseMap, (p.pptExportConfig as PptExportConfig | null) ?? undefined, middleDataUri, p.title);
    }

    {
      const slide = pptx.addSlide();
      slide.background = { data: thankYouDataUri };
    }

    const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    const filename = `${demandProject.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}-properties.pptx`;

    const cfg = await db.appSetting.findMany({ where: { key: { in: ["smtp_host", "smtp_user", "smtp_pass"] } } });
    const cfgMap = Object.fromEntries(cfg.map((s) => [s.key, s.value]));
    const smtpConfigured = !!(cfgMap.smtp_user || process.env.SMTP_USER) && !!(cfgMap.smtp_pass || process.env.SMTP_PASS);
    if (!smtpConfigured) {
      await logAttempt("error", "SMTP is not configured — set it up in Settings before sending emails");
      return apiError("SMTP is not configured — set it up in Settings before sending emails");
    }

    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;white-space:pre-wrap;line-height:1.6">${escapeHtml(body)}</div>`;
    await sendEmail(to, subject, html, [{ filename, content: buf }]);

    await logAttempt("sent");
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    await logAttempt("error", message);
    return apiError(message, 500);
  }
}
