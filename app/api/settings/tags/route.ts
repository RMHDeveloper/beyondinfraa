import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function GET() {
  const tags = await db.tag.findMany({ orderBy: { name: "asc" } });
  return Response.json(tags);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { name, color } = await req.json();
  if (!name) return apiError("Name required");

  const tag = await db.tag.create({ data: { name, color: color ?? "#6B7280" } });
  return Response.json(tag, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { id } = await req.json();
  await db.tag.delete({ where: { id } });
  return Response.json({ ok: true });
}
