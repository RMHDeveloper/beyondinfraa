import { db } from "@/lib/db";
import ProjectsClient from "./ProjectsClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, buyerReqs, tenantReqs, contacts, categories, matches, proposals, siteVisits, negotiations, deals] = await Promise.all([
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, projectNumber: true, title: true, state: true, createdAt: true,
        clientName: true, clientPhone: true, leadSource: true, potentialScore: true,
        category:    { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true } },
        status:      { select: { id: true, name: true, color: true } },
      },
    }),
    db.buyerRequirement.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, reqNumber: true, status: true, createdAt: true, notes: true,
        budgetMin: true, budgetMax: true, areaMin: true, areaMax: true,
        contact:  { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    db.tenantRequirement.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, reqNumber: true, status: true, createdAt: true, notes: true,
        rentMin: true, rentMax: true, areaMin: true, areaMax: true, leaseDuration: true,
        contact:  { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    db.contact.findMany({ select: { id: true, name: true, type: true }, orderBy: { name: "asc" }, take: 1000 }),
    db.category.findMany({ select: { id: true, name: true, slug: true, sortOrder: true }, orderBy: { sortOrder: "asc" } }),
    db.match.findMany({
      orderBy: { matchPct: "desc" },
      take: 500,
      select: {
        id: true, matchPct: true, confirmedAt: true, criteriaMatched: true, criteriaMissed: true,
        alreadySent: true, isManual: true,
        buyerRequirementId: true, tenantRequirementId: true,
        project: { select: { id: true, title: true, projectNumber: true } },
      },
    }),
    db.proposal.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, proposalNumber: true, status: true, createdAt: true,
        contact: { select: { id: true, name: true, type: true } },
        items: { select: { id: true, response: true, project: { select: { id: true, title: true } } } },
      },
    }),
    db.siteVisit.findMany({
      orderBy: { scheduledAt: "desc" },
      take: 100,
      select: {
        id: true, visitNumber: true, status: true, scheduledAt: true, notes: true,
        contact: { select: { id: true, name: true, type: true } },
        project: { select: { id: true, title: true } },
      },
    }),
    db.negotiation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, status: true, createdAt: true,
        contact: { select: { id: true, name: true, type: true } },
        project: { select: { id: true, title: true } },
        rounds:  { orderBy: { createdAt: "asc" }, take: 20, select: { id: true, createdAt: true, notes: true, offerAmount: true, offerBy: true } },
      },
    }),
    db.deal.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, type: true, finalPrice: true, finalRent: true, closureDate: true,
        contact: { select: { id: true, name: true, type: true } },
        project: { select: { id: true, title: true, category: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  return (
    <ProjectsClient
      projects={projects}
      buyerReqs={buyerReqs}
      tenantReqs={tenantReqs}
      contacts={contacts}
      categories={categories}
      matches={matches}
      proposals={proposals}
      siteVisits={siteVisits}
      negotiations={negotiations}
      deals={deals}
    />
  );
}
