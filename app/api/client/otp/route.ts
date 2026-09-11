import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, normalizePhone, withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async function POST(req: NextRequest) {
  const { token, phone } = await req.json();
  if (!token || !phone) return apiError("token and phone required");

  const link = await db.clientLink.findFirst({ where: { OR: [{ token }, { slug: token }] } });
  if (!link || !link.isActive) return apiError("Invalid or expired link", 404);

  // Match against any contact phone on the project: the primary contact
  // phone, or any row in the "Additional Contacts" repeater — matched by
  // question label since these aren't dedicated project columns.
  const contactQuestions = await db.question.findMany({
    where: { label: { in: ["Primary Contact Phone", "Additional Contacts"] } },
    select: { id: true, label: true },
  });
  const responses = await db.response.findMany({
    where: { projectId: link.projectId, questionId: { in: contactQuestions.map((q) => q.id) } },
    select: { questionId: true, value: true, jsonValue: true },
  });

  const target = normalizePhone(phone);
  const knownPhones = new Set<string>();
  for (const r of responses) {
    const q = contactQuestions.find((q) => q.id === r.questionId);
    if (q?.label === "Primary Contact Phone" && r.value) {
      knownPhones.add(normalizePhone(r.value));
    } else if (q?.label === "Additional Contacts" && Array.isArray(r.jsonValue)) {
      for (const row of r.jsonValue as Record<string, unknown>[]) {
        if (typeof row?.Phone === "string" && row.Phone) knownPhones.add(normalizePhone(row.Phone));
      }
    }
  }

  if (!target || !knownPhones.has(target)) return apiError("Phone number does not match", 400);

  // Cooldown: block re-issuing a fresh OTP within 60s of the last one, so a client
  // can't reset the verify-attempts counter (verify-otp/route.ts) by endlessly
  // re-requesting new OTPs to keep brute-forcing.
  const OTP_TTL_MS = 10 * 60 * 1000;
  if (link.otpExpiresAt) {
    const issuedAt = link.otpExpiresAt.getTime() - OTP_TTL_MS;
    const elapsed = Date.now() - issuedAt;
    if (elapsed < 60 * 1000) {
      return apiError("Please wait a minute before requesting another OTP", 429);
    }
  }

  const isDev = process.env.NODE_ENV !== "production";
  // ALLOW_OTP_BYPASS fixes every OTP to OTP_DEV_BYPASS's value even in production —
  // for use only while SMS delivery isn't wired up yet. Remove both env vars once it is.
  const bypassAllowed = isDev || process.env.ALLOW_OTP_BYPASS === "true";
  const otp =
    (bypassAllowed && process.env.OTP_DEV_BYPASS) ||
    String(Math.floor(100000 + Math.random() * 900000));

  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.clientLink.update({
    where: { id: link.id },
    data: { otp, otpExpiresAt, otpAttempts: 0 },
  });

  await db.auditLog.create({
    data: {
      projectId: link.projectId,
      action: "OTP_SENT",
      entityType: "client_link",
      entityId: link.id,
      meta: { phone } as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  // In production, send via SMS. Dev: return in response.
  return Response.json({ ok: true, ...(isDev ? { otp } : {}) });
});
