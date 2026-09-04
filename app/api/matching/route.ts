import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET() {
  await requireSession();
  const matches = await db.match.findMany({
    orderBy: [{ matchPct: "desc" }, { createdAt: "desc" }],
    take: 500,
    include: {
      project: {
        select: { id: true, title: true, projectNumber: true, category: { select: { name: true } } },
      },
      demandProject: {
        select: {
          id: true, title: true, projectNumber: true,
          clientContact: { select: { name: true } },
          subcategory: { select: { name: true } },
        },
      },
      deal: { select: { id: true } },
    },
  });
  return Response.json(matches);
});
