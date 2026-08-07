import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MEETING_PREFIX = "__meeting__:";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: projectId } = await params;

  const notes = await db.projectNote.findMany({
    where: { projectId, content: { startsWith: MEETING_PREFIX } },
    orderBy: { createdAt: "desc" },
  });

  const meetings = notes.map(n => {
    try {
      return { id: n.id, ...JSON.parse(n.content.slice(MEETING_PREFIX.length)) };
    } catch {
      return null;
    }
  }).filter(Boolean);

  return Response.json(meetings);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id: projectId } = await params;
  const body = await req.json();

  const content = MEETING_PREFIX + JSON.stringify({
    title:       body.title,
    attendees:   body.attendees || "",
    scheduledAt: body.scheduledAt,
    notes:       body.notes || null,
    outcome:     body.outcome || null,
  });

  const note = await db.projectNote.create({ data: { projectId, content, authorId: session.id } });
  return Response.json({ id: note.id, ok: true }, { status: 201 });
}
