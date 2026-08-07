import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { sendClientPortalLink } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { phone } = await req.json();
  if (!phone) return apiError("phone required");

  const project = await db.project.findUnique({ where: { id } });
  if (!project) return apiError("Not found", 404);

  // Deactivate existing links for this project
  await db.clientLink.updateMany({
    where: { projectId: id, isActive: true },
    data: { isActive: false },
  });

  const link = await db.clientLink.create({
    data: { projectId: id, phone },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/p/${link.token}`;

  // Send email if client email is on the project
  if (project.clientEmail) {
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
