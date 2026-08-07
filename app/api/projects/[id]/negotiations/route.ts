import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const body = await req.json();

  if (!body.contactId) {
    return Response.json({ error: "contactId required" }, { status: 400 });
  }

  // Check if negotiation with this contact already exists for this project
  const existing = await db.negotiation.findFirst({
    where: { projectId: id, contactId: body.contactId },
  });
  if (existing) {
    return Response.json(existing);
  }

  const negotiation = await db.negotiation.create({
    data: {
      projectId: id,
      contactId: body.contactId,
      status: "ACTIVE",
    },
    select: {
      id: true, status: true, createdAt: true,
      contact: { select: { id: true, name: true, phone: true } },
      rounds: { select: { id: true, roundNumber: true, offerBy: true, offerAmount: true, notes: true, createdAt: true } },
    },
  });

  return Response.json(negotiation);
}
