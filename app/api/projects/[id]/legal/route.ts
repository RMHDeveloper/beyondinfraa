import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LEGAL_KEY = "__legal_checklist__";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: projectId } = await params;

  const entry = await db.projectNote.findFirst({ where: { projectId, content: { startsWith: LEGAL_KEY } } });
  if (!entry) return Response.json({ checked: {}, notes: {} });

  try {
    const data = JSON.parse(entry.content.slice(LEGAL_KEY.length));
    return Response.json(data);
  } catch {
    return Response.json({ checked: {}, notes: {} });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id: projectId } = await params;
  const body = await req.json();

  const content = LEGAL_KEY + JSON.stringify(body);
  const existing = await db.projectNote.findFirst({ where: { projectId, content: { startsWith: LEGAL_KEY } } });

  if (existing) {
    await db.projectNote.update({ where: { id: existing.id }, data: { content } });
  } else {
    await db.projectNote.create({ data: { projectId, content, authorId: session.id } });
  }

  return Response.json({ ok: true });
}
