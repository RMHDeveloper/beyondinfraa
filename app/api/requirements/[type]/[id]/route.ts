import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  await requireSession();
  const { type, id } = await params;

  if (type === "buyer") {
    const req = await db.buyerRequirement.findUnique({
      where: { id },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
        category: { select: { id: true, name: true } },
        customFields: { orderBy: { sortOrder: "asc" } },
        matches: {
          where: { confirmedAt: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true, matchPct: true, confirmedAt: true, criteriaMatched: true, criteriaMissed: true,
            project: { select: { id: true, projectNumber: true, title: true, status: { select: { name: true, color: true } } } },
          },
        },
      },
    });
    if (!req) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(req);
  }

  if (type === "tenant") {
    const req = await db.tenantRequirement.findUnique({
      where: { id },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
        category: { select: { id: true, name: true } },
        customFields: { orderBy: { sortOrder: "asc" } },
        matches: {
          where: { confirmedAt: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true, matchPct: true, confirmedAt: true, criteriaMatched: true, criteriaMissed: true,
            project: { select: { id: true, projectNumber: true, title: true, status: { select: { name: true, color: true } } } },
          },
        },
      },
    });
    if (!req) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(req);
  }

  return Response.json({ error: "Invalid type" }, { status: 400 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  await requireSession();
  const { type, id } = await params;
  const body = await req.json();

  if (type === "buyer") {
    const { status, notes, budgetMin, budgetMax, areaMin, areaMax, bhk, furnishing, preferredLocations, priority, timeline, propertySubtype } = body;
    const updated = await db.buyerRequirement.update({
      where: { id },
      data: { status, notes, budgetMin, budgetMax, areaMin, areaMax, bhk, furnishing, preferredLocations, priority, timeline, propertySubtype },
    });
    return Response.json(updated);
  }
  if (type === "tenant") {
    const {
      status, notes, rentMin, rentMax, depositBudget, areaMin, areaMax, furnishing, priority,
      leaseDuration, lockInPeriod, propertySubtype, operationalReqs, preferredLocations, moveInDate,
      carParksRequired, floorPreference, propertySharing, flooringType, facilityGrade,
      powerConnectionLevel, propertyAgePreference, directionFacing, entityType, paymentBreakup,
      brokeragePct, features, additionalContacts,
    } = body;
    const updated = await db.tenantRequirement.update({
      where: { id },
      data: {
        status, notes, rentMin, rentMax, depositBudget, areaMin, areaMax, furnishing, priority,
        leaseDuration, lockInPeriod, propertySubtype, operationalReqs, preferredLocations,
        moveInDate: moveInDate ? new Date(moveInDate) : moveInDate,
        carParksRequired, floorPreference, propertySharing, flooringType, facilityGrade,
        powerConnectionLevel, propertyAgePreference, directionFacing, entityType, paymentBreakup,
        brokeragePct, features, additionalContacts,
      },
    });
    return Response.json(updated);
  }
  return Response.json({ error: "Invalid type" }, { status: 400 });
}
