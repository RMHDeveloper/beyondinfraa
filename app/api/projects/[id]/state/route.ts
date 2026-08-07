import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { id } = await params;
  const { state } = await req.json();

  const validStates = ["OPEN", "LOCKED", "ARCHIVED"];
  if (!validStates.includes(state)) return apiError("Invalid state");

  const project = await db.project.findUnique({ where: { id }, select: { state: true } });
  if (!project) return apiError("Not found", 404);

  const updated = await db.project.update({ where: { id }, data: { state } });

  const action = state === "LOCKED" ? "LOCK" : state === "ARCHIVED" ? "ARCHIVE" : "UNLOCK";
  await db.auditLog.create({
    data: {
      projectId: id,
      userId: session.id,
      action,
      entityType: "project",
      entityId: id,
      before: { state: project.state },
      after: { state },
    },
  });

  await db.lockEntry.create({
    data: {
      projectId: id,
      scope: "project",
      lockedBy: session.id,
      ...(state === "OPEN" ? { unlockedAt: new Date(), unlockedBy: session.id } : {}),
    },
  });

  return Response.json(updated);
}
