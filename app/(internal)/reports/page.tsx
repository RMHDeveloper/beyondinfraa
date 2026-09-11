import { db } from "@/lib/db";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  // "Dropped" projects are excluded from the analytics counts below (they're still
  // visible in the projects list and status breakdown, just not counted toward stats).
  const notDropped = { status: { isNot: { name: { equals: "Dropped", mode: "insensitive" as const } } } };

  const [
    totalProjects,
    byCategory,
    byStatus,
    totalContacts,
    totalBuyerReqs,
    totalTenantReqs,
    totalProposals,
    totalSiteVisits,
    totalDeals,
    siteVisitsByStatus,
    deals,
    projects,
  ] = await Promise.all([
    db.project.count({ where: notDropped }),
    db.project.groupBy({ by: ["categoryId"], _count: true, where: notDropped }),
    db.project.groupBy({ by: ["statusId"], _count: true }),
    db.contact.count(),
    db.project.count({ where: { ...notDropped, subcategory: { name: "Buy" } } }),
    db.project.count({ where: { ...notDropped, subcategory: { name: "Tenant" } } }),
    db.proposal.count(),
    db.siteVisit.count(),
    db.deal.count(),
    db.siteVisit.groupBy({ by: ["status"], _count: true }),
    db.deal.findMany({
      select: {
        id: true, dealNumber: true, type: true, finalPrice: true, finalRent: true,
        brokerage: true, closureDate: true, createdAt: true,
        contact: { select: { name: true } },
        project: { select: { title: true, category: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      select: { id: true, title: true, createdAt: true, category: { select: { name: true } }, status: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [categories, statuses] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true } }),
    db.status.findMany({ select: { id: true, name: true, color: true } }),
  ]);

  const byCategoryNamed = byCategory.map((b) => ({
    category: categories.find((c) => c.id === b.categoryId)?.name ?? "Unknown",
    count: b._count,
  }));

  const byStatusNamed = byStatus.map((b) => ({
    status: statuses.find((s) => s.id === b.statusId)?.name ?? "No Status",
    color: statuses.find((s) => s.id === b.statusId)?.color ?? "#6B7280",
    count: b._count,
  }));

  const siteVisitsByStatusNamed = siteVisitsByStatus.map((s) => ({
    status: s.status,
    count: s._count,
  }));

  const dealsFlat = deals.map((d) => ({
    id: d.id,
    dealNumber: d.dealNumber,
    type: d.type,
    finalPrice: d.finalPrice,
    finalRent: d.finalRent,
    brokerage: d.brokerage,
    closureDate: d.closureDate,
    createdAt: d.createdAt,
    contactName: d.contact.name,
    projectTitle: d.project.title,
    category: d.project.category.name,
  }));

  const projectsFlat = projects.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category.name,
    status: p.status?.name ?? "No Status",
    createdAt: p.createdAt,
  }));

  return (
    <ReportsClient
      data={{
        totalProjects, byCategoryNamed, byStatusNamed,
        totalContacts, totalBuyerReqs, totalTenantReqs,
        totalProposals, totalSiteVisits, totalDeals,
        siteVisitsByStatusNamed, deals: dealsFlat, projects: projectsFlat,
      }}
    />
  );
}
