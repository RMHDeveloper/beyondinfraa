import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { categoryId, name, slug } = await req.json();
  if (!categoryId || !name || !slug) return apiError("categoryId, name, and slug required");

  const max = await db.subcategory.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });
  const sub = await db.subcategory.create({
    data: { categoryId, name, slug, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  return Response.json(sub, { status: 201 });
}
