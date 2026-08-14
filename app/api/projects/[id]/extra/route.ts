import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const [ownerUnits, negotiations, developerProposals, matches, proposals, developers] = await Promise.all([
    db.ownerUnit.findMany({
      where: { projectId: id },
      orderBy: { unitNumber: "asc" },
      select: {
        id: true, unitNumber: true, ownerName: true, phone: true, email: true,
        existingArea: true, uds: true, occupancyStatus: true, consentStatus: true,
        conditions: true, meetingAttended: true, notes: true,
      },
    }),
    db.negotiation.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, status: true, createdAt: true,
        contact: { select: { id: true, name: true, phone: true } },
        rounds: {
          orderBy: { createdAt: "asc" },
          select: { id: true, roundNumber: true, offerBy: true, offerAmount: true, notes: true, createdAt: true },
        },
      },
    }),
    db.developerProposal.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, status: true, createdAt: true, developerId: true,
        additionalArea: true, corpusFund: true, monthlyRent: true, deposit: true,
        constructionTimeline: true, gracePeriod: true, bankGuarantee: true,
        parking: true, amenities: true, internalRemarks: true,
        developer: { select: { id: true, contact: { select: { id: true, name: true } } } },
      },
    }),
    db.match.findMany({
      where: { projectId: id },
      orderBy: { matchPct: "desc" },
      take: 20,
      select: {
        id: true, matchPct: true, confirmedAt: true, criteriaMatched: true, criteriaMissed: true,
        alreadySent: true, isManual: true, buyerRequirementId: true, tenantRequirementId: true,
      },
    }),
    db.proposal.findMany({
      where: { items: { some: { projectId: id } } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, proposalNumber: true, status: true, createdAt: true,
        contact: { select: { id: true, name: true } },
      },
    }),
    db.developer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, contact: { select: { id: true, name: true } } },
    }),
  ]);

  return Response.json({ ownerUnits, negotiations, developerProposals, matches, proposals, developers });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const body = await req.json();

  if (body.type === "ownerUnit") {
    const unit = await db.ownerUnit.create({
      data: {
        projectId:       id,
        unitNumber:      body.unitNumber,
        ownerName:       body.ownerName,
        phone:           body.phone || null,
        email:           body.email || null,
        existingArea:    body.existingArea ? parseFloat(body.existingArea) : null,
        uds:             body.uds ? parseFloat(body.uds) : null,
        occupancyStatus: body.occupancyStatus || null,
        consentStatus:   body.consentStatus || "NOT_CONTACTED",
        conditions:      body.conditions || null,
        meetingAttended: body.meetingAttended === true,
        notes:           body.notes || null,
      },
    });
    return Response.json(unit);
  }

  if (body.type === "negotiationRound") {
    const round = await db.negotiationRound.create({
      data: {
        negotiationId: body.negotiationId,
        roundNumber:   body.roundNumber,
        offerBy:       body.offerBy,
        offerAmount:   body.offerAmount ? parseFloat(body.offerAmount) : null,
        notes:         body.notes || null,
      },
    });
    return Response.json(round);
  }

  if (body.type === "deal") {
    const existing = await db.deal.findUnique({ where: { projectId: id } });
    if (existing) {
      return Response.json({ error: "This property already has a closed deal." }, { status: 409 });
    }
    const count = await db.deal.count();
    const dealNumber = `DEAL-${String(count + 1).padStart(4, "0")}`;
    const deal = await db.deal.create({
      data: {
        dealNumber,
        projectId: id,
        contactId: body.contactId,
        type: body.dealType,
        finalPrice: body.finalPrice ? parseFloat(body.finalPrice) : null,
        finalRent: body.finalRent ? parseFloat(body.finalRent) : null,
        closureDate: body.closureDate ? new Date(body.closureDate) : new Date(),
        notes: body.notes || null,
      },
    });
    await db.project.update({ where: { id }, data: { state: "ARCHIVED" } });
    return Response.json(deal);
  }

  if (body.type === "developerProposal") {
    // Enforce: only one SELECTED developer per project
    if (body.status === "SELECTED") {
      const existing = await db.developerProposal.findFirst({
        where: { projectId: id, status: "SELECTED" },
      });
      if (existing) {
        return Response.json({ error: "Another developer is already SELECTED for this project." }, { status: 409 });
      }
    }
    const proposal = await db.developerProposal.create({
      data: {
        projectId:            id,
        developerId:          body.developerId,
        status:               body.status || "NOT_CONTACTED",
        additionalArea:       body.additionalArea ? parseFloat(body.additionalArea) : null,
        corpusFund:           body.corpusFund ? parseFloat(body.corpusFund) : null,
        monthlyRent:          body.monthlyRent ? parseFloat(body.monthlyRent) : null,
        deposit:              body.deposit ? parseFloat(body.deposit) : null,
        constructionTimeline: body.constructionTimeline ? parseInt(body.constructionTimeline) : null,
        gracePeriod:          body.gracePeriod ? parseInt(body.gracePeriod) : null,
        bankGuarantee:        body.bankGuarantee || null,
        parking:              body.parking ? parseInt(body.parking) : null,
        amenities:            body.amenities || null,
        internalRemarks:      body.internalRemarks || null,
      },
      include: { developer: { include: { contact: true } } },
    });
    return Response.json(proposal);
  }

  return Response.json({ error: "unknown type" }, { status: 400 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const body = await req.json();

  if (body.type === "ownerUnit") {
    const unit = await db.ownerUnit.update({
      where: { id: body.id },
      data: {
        unitNumber:      body.unitNumber,
        ownerName:       body.ownerName,
        phone:           body.phone || null,
        email:           body.email || null,
        existingArea:    body.existingArea ? parseFloat(body.existingArea) : null,
        uds:             body.uds ? parseFloat(body.uds) : null,
        occupancyStatus: body.occupancyStatus || null,
        consentStatus:   body.consentStatus,
        conditions:      body.conditions || null,
        meetingAttended: body.meetingAttended === true,
        notes:           body.notes || null,
      },
    });
    return Response.json(unit);
  }

  if (body.type === "negotiation") {
    const negotiation = await db.negotiation.update({
      where: { id: body.id },
      data: { status: body.status },
    });
    return Response.json(negotiation);
  }

  if (body.type === "developerProposal") {
    // Enforce: only one SELECTED developer per project
    if (body.status === "SELECTED") {
      const existing = await db.developerProposal.findFirst({
        where: { projectId: id, status: "SELECTED", NOT: { id: body.id } },
      });
      if (existing) {
        return Response.json({ error: "Another developer is already SELECTED for this project." }, { status: 409 });
      }
    }
    const proposal = await db.developerProposal.update({
      where: { id: body.id },
      data: {
        status:               body.status,
        additionalArea:       body.additionalArea !== undefined ? (body.additionalArea ? parseFloat(body.additionalArea) : null) : undefined,
        corpusFund:           body.corpusFund !== undefined ? (body.corpusFund ? parseFloat(body.corpusFund) : null) : undefined,
        monthlyRent:          body.monthlyRent !== undefined ? (body.monthlyRent ? parseFloat(body.monthlyRent) : null) : undefined,
        deposit:              body.deposit !== undefined ? (body.deposit ? parseFloat(body.deposit) : null) : undefined,
        constructionTimeline: body.constructionTimeline !== undefined ? (body.constructionTimeline ? parseInt(body.constructionTimeline) : null) : undefined,
        gracePeriod:          body.gracePeriod !== undefined ? (body.gracePeriod ? parseInt(body.gracePeriod) : null) : undefined,
        bankGuarantee:        body.bankGuarantee !== undefined ? (body.bankGuarantee || null) : undefined,
        parking:              body.parking !== undefined ? (body.parking ? parseInt(body.parking) : null) : undefined,
        amenities:            body.amenities !== undefined ? (body.amenities || null) : undefined,
        internalRemarks:      body.internalRemarks !== undefined ? (body.internalRemarks || null) : undefined,
      },
      include: { developer: { include: { contact: true } } },
    });
    return Response.json(proposal);
  }

  return Response.json({ error: "unknown type" }, { status: 400 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  await params; // consume params (projectId not needed for delete by record id)
  const body = await req.json();

  if (body.type === "ownerUnit") {
    await db.ownerUnit.delete({ where: { id: body.id } });
    return Response.json({ ok: true });
  }

  if (body.type === "developerProposal") {
    await db.developerProposal.delete({ where: { id: body.id } });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unknown type" }, { status: 400 });
}
