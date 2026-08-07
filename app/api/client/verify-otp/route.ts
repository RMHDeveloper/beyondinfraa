import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, otp } = await req.json();
  if (!token || !otp) return apiError("token and otp required");

  const link = await db.clientLink.findUnique({
    where: { token },
    include: { project: { select: { id: true, title: true, state: true } } },
  });

  if (!link || !link.isActive) return apiError("Invalid link", 404);
  if (!link.otp || !link.otpExpiresAt) return apiError("OTP not sent", 400);
  if (new Date() > link.otpExpiresAt) return apiError("OTP expired", 400);
  if (link.otp !== otp) return apiError("Incorrect OTP", 400);

  await db.clientLink.update({
    where: { token },
    data: { verifiedAt: new Date(), otp: null },
  });

  await db.auditLog.create({
    data: {
      projectId: link.projectId,
      action: "OTP_VERIFIED",
      entityType: "client_link",
      entityId: link.id,
    },
  });

  // Issue a short-lived client session JWT (stored in cookie)
  const clientToken = jwt.sign(
    { clientLinkId: link.id, projectId: link.projectId },
    process.env.JWT_SECRET!,
    { expiresIn: "24h" }
  );

  const cookieStore = await cookies();
  cookieStore.set("bi_client_token", clientToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 86400,
  });

  return Response.json({ ok: true, projectId: link.projectId });
}
