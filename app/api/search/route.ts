import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(req: NextRequest) {
  await requireSession();
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ projects: [], contacts: [] });

  const [projects, contacts] = await Promise.all([
    db.project.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { projectNumber: { contains: q, mode: "insensitive" } },
          { clientName: { contains: q, mode: "insensitive" } },
          { clientPhone: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, projectNumber: true, category: { select: { name: true } }, subcategory: { select: { name: true } } },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    db.contact.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, phone: true, email: true, type: true },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return Response.json({ projects, contacts });
});
