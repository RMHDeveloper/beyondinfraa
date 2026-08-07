import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST — create one or more manual matches
export async function POST(req: Request) {
  await requireSession();
  const { projectId, buyerRequirementId, tenantRequirementId } = await req.json();

  if (!projectId || (!buyerRequirementId && !tenantRequirementId)) {
    return Response.json({ error: "projectId and one of buyerRequirementId/tenantRequirementId required" }, { status: 400 });
  }

  // Upsert — don't create duplicates
  const existing = await db.match.findFirst({
    where: { projectId, buyerRequirementId: buyerRequirementId ?? null, tenantRequirementId: tenantRequirementId ?? null },
  });

  if (existing) {
    // If it was auto-suggested (not confirmed), confirm it now
    const updated = await db.match.update({
      where: { id: existing.id },
      data: { confirmedAt: existing.confirmedAt ?? new Date(), isManual: true },
    });
    return Response.json(updated);
  }

  const match = await db.match.create({
    data: {
      projectId,
      buyerRequirementId: buyerRequirementId ?? null,
      tenantRequirementId: tenantRequirementId ?? null,
      matchPct: 0,
      isManual: true,
      confirmedAt: new Date(),
    },
  });
  return Response.json(match, { status: 201 });
}
