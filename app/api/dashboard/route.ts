import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(req: Request) {
  await requireSession();
  const employeeId = new URL(req.url).searchParams.get("employeeId") || undefined;
  const projectWhere = employeeId ? { assigneeId: employeeId } : {};

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
    pipelineValue,
  ] = await Promise.all([
    db.project.count({ where: projectWhere }),
    db.project.groupBy({ by: ["state"], _count: { id: true }, where: projectWhere }),
    db.project.groupBy({ by: ["categoryId"], _count: { id: true }, where: projectWhere }),
    db.project.groupBy({ by: ["statusId"], _count: { id: true }, where: projectWhere }),
    db.project.findMany({
      where: projectWhere,
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
    db.project.count({ where: { subcategory: { name: "Buy" }, state: { not: "ARCHIVED" } } }),
    db.project.count({ where: { subcategory: { name: "Tenant" }, state: { not: "ARCHIVED" } } }),
    db.match.count(),
    db.proposal.count(),
    db.siteVisit.count(),
    db.deal.count(),
    db.response.findMany({
      where: {
        question: { label: "Budget — Max" },
        project: { subcategory: { name: "Buy" }, state: { not: "ARCHIVED" } },
      },
      select: { value: true },
    }),
  ]);

  const categories = await db.category.findMany({ select: { id: true, name: true } });
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const statuses  = await db.status.findMany({ select: { id: true, name: true, color: true } });
  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]));

  // Per-category breakdowns for sector cards
  const catCounts = Object.fromEntries(
    byCategory.map((r) => [catMap[r.categoryId] ?? r.categoryId, r._count.id])
  );

  const [buyerByCat, tenantByCat, matchByCatRaw] = await Promise.all([
    db.project.groupBy({ by: ["categoryId"], _count: { id: true }, where: { subcategory: { name: "Buy" } } }),
    db.project.groupBy({ by: ["categoryId"], _count: { id: true }, where: { subcategory: { name: "Tenant" } } }),
    db.$queryRaw<{ categoryId: string; cnt: bigint }[]>`
      SELECT p."categoryId", COUNT(*)::bigint AS cnt
      FROM matches m JOIN projects p ON p.id = m."projectId"
      WHERE ${employeeId ?? null}::text IS NULL OR p."assigneeId" = ${employeeId ?? null}
      GROUP BY p."categoryId"
    `,
  ]);

  const buyerByCatMap  = Object.fromEntries(buyerByCat.map((r) => [catMap[r.categoryId] ?? "", r._count.id]));
  const tenantByCatMap = Object.fromEntries(tenantByCat.map((r) => [catMap[r.categoryId] ?? "", r._count.id]));
  const matchByCatMap  = Object.fromEntries(matchByCatRaw.map((r) => [catMap[r.categoryId] ?? "Unknown", Number(r.cnt)]));

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
    pipelineValue: pipelineValue.reduce((sum, r) => sum + (parseFloat(r.value ?? "0") || 0), 0),
    catCounts,
    buyerByCatMap,
    tenantByCatMap,
    matchByCatMap,
  });
});
