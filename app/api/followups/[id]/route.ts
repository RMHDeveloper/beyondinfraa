import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const PATCH = withErrorHandling(async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const body = await req.json();

  const data: { isDone?: boolean; doneAt?: Date | null; dueAt?: Date } = {};
  if (typeof body.isDone === "boolean") {
    data.isDone = body.isDone;
    data.doneAt = body.isDone ? new Date() : null;
  }
  if (typeof body.dueAt === "string" && body.dueAt) data.dueAt = new Date(body.dueAt);

  const followUp = await db.followUp.update({ where: { id }, data });
  return Response.json(followUp);
});
