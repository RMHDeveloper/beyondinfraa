import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();

  const [
    totalProjects,
    byState,
    byCategory,
    byStatus,
    recentProjects,
    overdueFollowups,
    totalContacts,
    totalBuyerReqs,
    totalTenantReqs,
    totalMatches,
    totalProposals,
    totalSiteVisits,
    totalDeals,
    activeNegotiations,
    pipelineValue,
  ] = await Promise.all([
    db.project.count(),
    db.project.groupBy({ by: ["state"], _count: { id: true } }),
    db.project.groupBy({ by: ["categoryId"], _count: { id: true } }),
    db.project.groupBy({ by: ["statusId"], _count: { id: true } }),
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, projectNumber: true, title: true, state: true, createdAt: true,
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        status: { select: { id: true, name: true, color: true } },
      },
    }),
    db.followUp.count({ where: { isDone: false, dueAt: { lt: new Date() } } }),
    db.contact.count(),
    db.buyerRequirement.count({ where: { status: { in: ["NEW", "ACTIVE"] } } }),
    db.tenantRequirement.count({ where: { status: { in: ["NEW", "ACTIVE"] } } }),
    db.match.count(),
    db.proposal.count(),
    db.siteVisit.count(),
    db.deal.count(),
    db.negotiation.count({ where: { status: "ACTIVE" } }),
    db.buyerRequirement.aggregate({ _sum: { budgetMax: true }, where: { status: { in: ["NEW", "ACTIVE"] } } }),
  ]);

  const categories = await db.category.findMany({ select: { id: true, name: true } });
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const statuses  = await db.status.findMany({ select: { id: true, name: true, color: true } });
  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]));

  // Per-category breakdowns for sector cards
  const catCounts = Object.fromEntries(
    byCategory.map((r) => [catMap[r.categoryId] ?? r.categoryId, r._count.id])
  );

  const [buyerByCat, tenantByCat, matchByCatRaw, negByCatRaw] = await Promise.all([
    db.buyerRequirement.groupBy({ by: ["categoryId"], _count: { id: true } }),
    db.tenantRequirement.groupBy({ by: ["categoryId"], _count: { id: true } }),
    db.$queryRaw<{ categoryId: string; cnt: bigint }[]>`
      SELECT p."categoryId", COUNT(*)::bigint AS cnt
      FROM matches m JOIN projects p ON p.id = m."projectId"
      GROUP BY p."categoryId"
    `,
    db.$queryRaw<{ categoryId: string; cnt: bigint }[]>`
      SELECT p."categoryId", COUNT(*)::bigint AS cnt
      FROM negotiations n JOIN projects p ON p.id = n."projectId"
      WHERE n.status = 'ACTIVE'
      GROUP BY p."categoryId"
    `,
  ]);

  const buyerByCatMap  = Object.fromEntries(buyerByCat.map((r) => [catMap[r.categoryId] ?? "", r._count.id]));
  const tenantByCatMap = Object.fromEntries(tenantByCat.map((r) => [catMap[r.categoryId] ?? "", r._count.id]));
  const matchByCatMap  = Object.fromEntries(matchByCatRaw.map((r) => [catMap[r.categoryId] ?? "Unknown", Number(r.cnt)]));
  const negByCatMap    = Object.fromEntries(negByCatRaw.map((r) => [catMap[r.categoryId] ?? "Unknown", Number(r.cnt)]));

  const openCount = byState.find((s) => s.state === "OPEN")?._count.id ?? 0;

  return Response.json({
    totalProjects,
    openCount,
    byState: byState.map((r) => ({ state: r.state, count: r._count.id })),
    byCategory: byCategory.map((r) => ({
      category: catMap[r.categoryId] ?? r.categoryId,
      count: r._count.id,
    })),
    byStatus: byStatus.filter((r) => r.statusId).map((r) => ({
      status: statusMap[r.statusId!]?.name ?? r.statusId,
      color: statusMap[r.statusId!]?.color ?? "#999",
      count: r._count.id,
    })),
    recentProjects,
    overdueFollowups,
    totalContacts,
    totalBuyerReqs,
    totalTenantReqs,
    totalMatches,
    totalProposals,
    totalSiteVisits,
    totalDeals,
    activeNegotiations,
    pipelineValue: pipelineValue._sum.budgetMax ?? 0,
    catCounts,
    buyerByCatMap,
    tenantByCatMap,
    matchByCatMap,
    negByCatMap,
  });
}
