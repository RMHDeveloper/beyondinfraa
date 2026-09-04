import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  if (!project) return apiError("Not found", 404);

  // Reuse the existing active link if there is one, instead of minting a new token every time.
  const existing = await db.clientLink.findFirst({
    where: { projectId: id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const link = existing ?? await db.clientLink.create({ data: { projectId: id } });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://beyondinfraa-k9zk.vercel.app";
  const url = `${baseUrl}/p/${link.slug ?? link.token}`;

  return Response.json({ token: link.token, slug: link.slug, url });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { slug } = await req.json();

  const link = await db.clientLink.findFirst({ where: { projectId: id, isActive: true }, orderBy: { createdAt: "desc" } });
  if (!link) return apiError("No active link for this project", 404);

  const cleanSlug = typeof slug === "string" ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) : "";

  try {
    const updated = await db.clientLink.update({
      where: { id: link.id },
      data: { slug: cleanSlug || null },
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://beyondinfraa-k9zk.vercel.app";
    const url = `${baseUrl}/p/${updated.slug ?? updated.token}`;
    return Response.json({ token: updated.token, slug: updated.slug, url });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return apiError("That link name is already taken", 409);
    }
    throw e;
  }
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
