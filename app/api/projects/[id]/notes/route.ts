import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const notes = await db.projectNote.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const { content, type, meetingAt } = await req.json();
  if (!content?.trim()) return apiError("content required");

  const note = await db.projectNote.create({
    data: {
      projectId: id,
      authorId: session.id,
      content: content.trim(),
      type: type ?? "note",
      meetingAt: meetingAt ? new Date(meetingAt) : null,
    },
  });

  await db.auditLog.create({
    data: {
      projectId: id,
      userId: session.id,
      action: "CREATE",
      entityType: "note",
      entityId: note.id,
    },
  });

  return Response.json(note);
}
