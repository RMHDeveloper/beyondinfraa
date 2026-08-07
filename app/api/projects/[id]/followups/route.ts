import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const followups = await db.followUp.findMany({
    where: { projectId: id },
    orderBy: { dueAt: "asc" },
  });
  return Response.json(followups);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const { description, dueAt, assigneeId } = await req.json();
  if (!description?.trim() || !dueAt) return apiError("description and dueAt required");

  const followup = await db.followUp.create({
    data: {
      projectId: id,
      description: description.trim(),
      dueAt: new Date(dueAt),
      assigneeId: assigneeId ?? null,
    },
  });
  return Response.json(followup);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id: projectId } = await params;
  const { id, isDone } = await req.json();
  if (!id) return apiError("id required");

  const updated = await db.followUp.update({
    where: { id },
    data: {
      isDone: !!isDone,
      doneAt: isDone ? new Date() : null,
    },
  });
  return Response.json(updated);
}
