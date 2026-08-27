import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { sendClientPortalLink } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { phone } = await req.json().catch(() => ({ phone: undefined }));

  const project = await db.project.findUnique({ where: { id } });
  if (!project) return apiError("Not found", 404);

  // Reuse an existing active link instead of invalidating it on every click
  const existing = await db.clientLink.findFirst({
    where: { projectId: id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const link = existing ?? await db.clientLink.create({
    data: { projectId: id, phone: phone || null },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://beyondinfraa-k9zk.vercel.app";
  const url = `${baseUrl}/p/${link.token}`;

  // Send email only when a new link was actually created, not on every reuse
  if (!existing && project.clientEmail) {
    sendClientPortalLink(project.clientEmail, project.clientName ?? "", project.title, url).catch(
      (e) => console.error("[mailer] client portal email failed:", e)
    );
  }

  return Response.json({ token: link.token, url });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const links = await db.clientLink.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return Response.json(links);
}
