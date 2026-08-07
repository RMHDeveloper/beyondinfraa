import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — return all active requirements in same category as the project, with existing match status
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id }, select: { categoryId: true } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const [buyerReqs, tenantReqs, existingMatches] = await Promise.all([
    db.buyerRequirement.findMany({
      where: { categoryId: project.categoryId, status: { in: ["NEW", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, reqNumber: true, status: true, createdAt: true,
        budgetMin: true, budgetMax: true, areaMin: true, areaMax: true,
        bhk: true, furnishing: true, preferredLocations: true, notes: true,
        contact: { select: { id: true, name: true } },
      },
    }),
    db.tenantRequirement.findMany({
      where: { categoryId: project.categoryId, status: { in: ["NEW", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, reqNumber: true, status: true, createdAt: true,
        rentMin: true, rentMax: true, areaMin: true, areaMax: true,
        furnishing: true, leaseDuration: true, preferredLocations: true, notes: true,
        contact: { select: { id: true, name: true } },
      },
    }),
    db.match.findMany({
      where: { projectId: id },
      select: { id: true, buyerRequirementId: true, tenantRequirementId: true, confirmedAt: true, matchPct: true },
    }),
  ]);

  const matchedBuyerIds = new Map(existingMatches.filter(m => m.buyerRequirementId).map(m => [m.buyerRequirementId!, m]));
  const matchedTenantIds = new Map(existingMatches.filter(m => m.tenantRequirementId).map(m => [m.tenantRequirementId!, m]));

  return Response.json({
    buyerReqs: buyerReqs.map(r => ({
      ...r,
      existingMatch: matchedBuyerIds.get(r.id) ?? null,
    })),
    tenantReqs: tenantReqs.map(r => ({
      ...r,
      existingMatch: matchedTenantIds.get(r.id) ?? null,
    })),
  });
}
