import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function whereClause(type: string, id: string) {
  return type === "buyer" ? { buyerRequirementId: id } : { tenantRequirementId: id };
}

export async function GET(_: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  await requireSession();
  const { type, id } = await params;
  const fields = await db.requirementCustomField.findMany({
    where: whereClause(type, id),
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(fields);
}

export async function POST(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  await requireSession();
  const { type, id } = await params;
  const { label, value } = await req.json();
  if (!label?.trim()) return Response.json({ error: "label required" }, { status: 400 });
  const count = await db.requirementCustomField.count({ where: whereClause(type, id) });
  const field = await db.requirementCustomField.create({
    data: { ...whereClause(type, id), label: label.trim(), value: value ?? null, sortOrder: count },
  });
  return Response.json(field, { status: 201 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  await requireSession();
  const { label, value, id: fieldId } = await req.json();
  const field = await db.requirementCustomField.update({
    where: { id: fieldId },
    data: { label: label?.trim() ?? undefined, value: value ?? null },
  });
  return Response.json(field);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  await requireSession();
  const { id: fieldId } = await req.json();
  await db.requirementCustomField.delete({ where: { id: fieldId } });
  return Response.json({ ok: true });
}
