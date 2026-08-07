import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function GET() {
  const statuses = await db.status.findMany({ orderBy: { sortOrder: "asc" } });
  return Response.json(statuses);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { name, slug, color } = await req.json();
  if (!name || !slug) return apiError("Name and slug required");

  const max = await db.status.aggregate({ _max: { sortOrder: true } });
  const status = await db.status.create({
    data: { name, slug, color: color ?? "#6B7280", sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  return Response.json(status, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { id, name, color } = await req.json();
  if (!id) return apiError("id required");

  const status = await db.status.update({ where: { id }, data: { name, color } });
  return Response.json(status);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return apiError("Forbidden", 403);

  const { id } = await req.json();
  await db.status.delete({ where: { id } });
  return Response.json({ ok: true });
}
