import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, name: true, slug: true, sortOrder: true,
      subcategories: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, sortOrder: true },
      },
    },
  });
  return Response.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { name, slug } = await req.json();
  if (!name || !slug) return apiError("Name and slug required");

  const max = await db.category.aggregate({ _max: { sortOrder: true } });
  const category = await db.category.create({
    data: { name, slug, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  return Response.json(category, { status: 201 });
}
