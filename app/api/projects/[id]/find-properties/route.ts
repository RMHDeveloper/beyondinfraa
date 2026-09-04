import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET — return all OPEN listing projects (Sell/Sale/Rent) in the same category as this demand project, with existing match status
export const GET = withErrorHandling(async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const demandProject = await db.project.findUnique({
    where: { id },
    select: { categoryId: true, subcategory: { select: { name: true } } },
  });
  if (!demandProject) return Response.json({ error: "Not found" }, { status: 404 });

  const listingSubcategoryNames = demandProject.subcategory.name === "Tenant" ? ["Rent"] : ["Sell", "Sale"];

  const [projects, existingMatches] = await Promise.all([
    db.project.findMany({
      where: {
        categoryId: demandProject.categoryId,
        state: "OPEN",
        subcategory: { name: { in: listingSubcategoryNames } },
      },
      select: { id: true, projectNumber: true, title: true, status: { select: { name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.match.findMany({
      where: { demandProjectId: id },
      select: { id: true, projectId: true, confirmedAt: true, matchPct: true },
    }),
  ]);

  const matchMap = new Map(existingMatches.map(m => [m.projectId, m]));

  return Response.json(
    projects.map(p => ({
      ...p,
      existingMatch: matchMap.get(p.id) ?? null,
    }))
  );
});
