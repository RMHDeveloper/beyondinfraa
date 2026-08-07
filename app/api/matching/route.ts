import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();
  const matches = await db.match.findMany({
    orderBy: [{ matchPct: "desc" }, { createdAt: "desc" }],
    take: 500,
    include: {
      project: {
        select: { id: true, title: true, projectNumber: true, category: { select: { name: true } } },
      },
      buyerRequirement: {
        select: { id: true, reqNumber: true, contact: { select: { name: true } } },
      },
      tenantRequirement: {
        select: { id: true, reqNumber: true, contact: { select: { name: true } } },
      },
    },
  });
  return Response.json(matches);
}
