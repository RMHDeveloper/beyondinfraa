import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH — confirm a suggested match
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { confirmedAt } = await req.json();
  const match = await db.match.update({
    where: { id },
    data: { confirmedAt: confirmedAt ? new Date(confirmedAt) : new Date() },
  });
  return Response.json(match);
}

// DELETE — remove a match
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await db.match.delete({ where: { id } });
  return Response.json({ ok: true });
}
