import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const fields = await db.projectCustomField.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(fields);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { label, value } = await req.json();
  if (!label?.trim()) return Response.json({ error: "label required" }, { status: 400 });
  const count = await db.projectCustomField.count({ where: { projectId: id } });
  const field = await db.projectCustomField.create({
    data: { projectId: id, label: label.trim(), value: value ?? null, sortOrder: count },
  });
  return Response.json(field, { status: 201 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: _projectId } = await params;
  const { id, label, value } = await req.json();
  const field = await db.projectCustomField.update({
    where: { id },
    data: { label: label?.trim() ?? undefined, value: value ?? null },
  });
  return Response.json(field);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: _projectId } = await params;
  const { id } = await req.json();
  await db.projectCustomField.delete({ where: { id } });
  return Response.json({ ok: true });
}
