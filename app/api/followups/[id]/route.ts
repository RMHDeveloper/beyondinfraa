import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { isDone } = await req.json();
  const followUp = await db.followUp.update({
    where: { id },
    data: { isDone, doneAt: isDone ? new Date() : null },
  });
  return Response.json(followUp);
}
