import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CLOSURE_KEY = "__closure__";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: projectId } = await params;

  const entry = await db.projectNote.findFirst({ where: { projectId, content: { startsWith: CLOSURE_KEY } } });
  if (!entry) return Response.json({});

  try {
    return Response.json(JSON.parse(entry.content.slice(CLOSURE_KEY.length)));
  } catch {
    return Response.json({});
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id: projectId } = await params;
  const body = await req.json();

  const content = CLOSURE_KEY + JSON.stringify(body);
  const existing = await db.projectNote.findFirst({ where: { projectId, content: { startsWith: CLOSURE_KEY } } });

  if (existing) {
    await db.projectNote.update({ where: { id: existing.id }, data: { content } });
  } else {
    await db.projectNote.create({ data: { projectId, content, authorId: session.id } });
  }

  return Response.json({ ok: true });
}
