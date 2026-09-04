import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { id } = await params;
  const body = await req.json();
  const { matchId, developerProposalId, dealType, finalPrice, finalRent, closureDate, notes } = body;

  if (!matchId && !developerProposalId) {
    return apiError("Either matchId or developerProposalId is required");
  }
  if (matchId && developerProposalId) {
    return apiError("Provide only one of matchId or developerProposalId");
  }
  if (!dealType) return apiError("dealType is required");

  const project = await db.project.findUnique({ where: { id }, select: { id: true } });
  if (!project) return apiError("Not found", 404);

  const existingDeal = await db.deal.findUnique({ where: { projectId: id } });
  if (existingDeal) {
    return apiError("This property already has a closed deal.", 409);
  }

  let contactId: string;
  let counterpartProjectId: string | null = null;

  if (matchId) {
    const match = await db.match.findUnique({
      where: { id: matchId },
      select: {
        id: true, projectId: true, demandProjectId: true,
        project: { select: { clientContactId: true } },
        demandProject: { select: { clientContactId: true } },
      },
    });
    if (!match || (match.projectId !== id && match.demandProjectId !== id)) {
      return apiError("Match not found for this project", 404);
    }
    // Award always closes out the current project; the contact is whichever side of the match ISN'T this project.
    const resolvedContactId = match.projectId === id ? match.demandProject?.clientContactId : match.project?.clientContactId;
    if (!resolvedContactId) return apiError("Match has no associated contact");
    contactId = resolvedContactId;
    counterpartProjectId = match.projectId === id ? match.demandProjectId : match.projectId;
  } else {
    const proposal = await db.developerProposal.findUnique({
      where: { id: developerProposalId },
      select: { id: true, projectId: true, status: true, developer: { select: { contactId: true } } },
    });
    if (!proposal || proposal.projectId !== id) return apiError("Developer proposal not found for this project", 404);

    const otherSelected = await db.developerProposal.findFirst({
      where: { projectId: id, status: "SELECTED", NOT: { id: proposal.id } },
    });
    if (otherSelected) {
      return apiError("Another developer is already SELECTED for this project.", 409);
    }
    contactId = proposal.developer.contactId;
  }

  const count = await db.deal.count();
  const dealNumber = `DEAL-${String(count + 1).padStart(4, "0")}`;

  const completedStatus = await db.status.findFirst({ where: { name: { equals: "Completed", mode: "insensitive" } } });

  const deal = await db.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        dealNumber,
        projectId: id,
        contactId,
        matchId: matchId ?? null,
        developerProposalId: developerProposalId ?? null,
        type: dealType,
        finalPrice: finalPrice ? parseFloat(finalPrice) : null,
        finalRent: finalRent ? parseFloat(finalRent) : null,
        closureDate: closureDate ? new Date(closureDate) : new Date(),
        notes: notes || null,
      },
    });

    if (completedStatus) {
      await tx.project.update({ where: { id }, data: { statusId: completedStatus.id } });
      if (counterpartProjectId) {
        await tx.project.update({ where: { id: counterpartProjectId }, data: { statusId: completedStatus.id } });
      }
    }

    if (matchId) {
      const existingMatch = await tx.match.findUnique({ where: { id: matchId }, select: { confirmedAt: true } });
      if (!existingMatch?.confirmedAt) {
        await tx.match.update({ where: { id: matchId }, data: { confirmedAt: new Date() } });
      }
    } else if (developerProposalId) {
      await tx.developerProposal.update({ where: { id: developerProposalId }, data: { status: "SELECTED" } });
    }

    await tx.auditLog.create({
      data: {
        projectId: id,
        userId: session.id,
        action: "AWARD",
        entityType: "deal",
        entityId: created.id,
        meta: { matchId: matchId ?? null, developerProposalId: developerProposalId ?? null, dealType },
      },
    });

    return created;
  });

  return Response.json(deal);
});
