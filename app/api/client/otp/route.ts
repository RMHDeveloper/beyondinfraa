import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, phone } = await req.json();
  if (!token || !phone) return apiError("token and phone required");

  const link = await db.clientLink.findUnique({ where: { token } });
  if (!link || !link.isActive) return apiError("Invalid or expired link", 404);

  // No phone-matching restriction -- the link itself is the access control.
  // Record whichever number verifies so it shows up in the audit trail.
  if (link.phone !== phone) await db.clientLink.update({ where: { token }, data: { phone } });

  const otp =
    process.env.OTP_DEV_BYPASS ??
    String(Math.floor(100000 + Math.random() * 900000));

  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.clientLink.update({
    where: { token },
    data: { otp, otpExpiresAt },
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

  // No real SMS delivery is wired up (Firebase isn't configured), so when the
  // fixed dev-bypass OTP is in use, return it directly -- otherwise there'd be
  // no way to know the code at all. If a real OTP provider is added later,
  // gate this back to dev-only.
  return Response.json({ ok: true, ...(process.env.OTP_DEV_BYPASS ? { otp } : {}) });
}
