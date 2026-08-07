import { db } from "@/lib/db";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
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
  ] = await Promise.all([
    db.project.count(),
    db.project.groupBy({ by: ["categoryId"], _count: true }),
    db.project.groupBy({ by: ["statusId"], _count: true }),
    db.contact.count(),
    db.buyerRequirement.count(),
    db.tenantRequirement.count(),
    db.proposal.count(),
    db.siteVisit.count(),
    db.deal.count(),
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

  return (
    <ReportsClient
      data={{
        totalProjects, byCategoryNamed, byStatusNamed,
        totalContacts, totalBuyerReqs, totalTenantReqs,
        totalProposals, totalSiteVisits, totalDeals,
      }}
    />
  );
}
