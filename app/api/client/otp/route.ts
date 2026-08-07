import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, phone } = await req.json();
  if (!token || !phone) return apiError("token and phone required");

  const link = await db.clientLink.findUnique({ where: { token } });
  if (!link || !link.isActive) return apiError("Invalid or expired link", 404);

  // Validate phone matches
  if (link.phone !== phone) return apiError("Phone number does not match", 400);

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

  // In production, send via SMS. Dev: return in response.
  const isDev = process.env.NODE_ENV !== "production";
  return Response.json({ ok: true, ...(isDev ? { otp } : {}) });
}
