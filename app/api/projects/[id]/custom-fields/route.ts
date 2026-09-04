import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { deleteObject } from "@/lib/storage";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const fields = await db.projectCustomField.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: "asc" },
    include: { file: { select: { id: true, fileName: true, mimeType: true, originalName: true } } },
  });
  return Response.json(fields);
});

export const POST = withErrorHandling(async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { label, value, type, showToClient } = await req.json();
  if (!label?.trim()) return Response.json({ error: "label required" }, { status: 400 });
  const count = await db.projectCustomField.count({ where: { projectId: id } });
  const field = await db.projectCustomField.create({
    data: {
      projectId: id,
      label: label.trim(),
      value: type === "IMAGE" ? null : (value ?? null),
      type: type === "IMAGE" ? "IMAGE" : "TEXT",
      sortOrder: count,
      showToClient: !!showToClient,
    },
  });
  return Response.json(field, { status: 201 });
});

export const PATCH = withErrorHandling(async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: _projectId } = await params;
  const { id, label, value, fileId, showToClient } = await req.json();
  const field = await db.projectCustomField.update({
    where: { id },
    data: {
      label: label?.trim() ?? undefined,
      ...(value !== undefined ? { value: value ?? null } : {}),
      ...(fileId !== undefined ? { fileId: fileId ?? null } : {}),
      ...(showToClient !== undefined ? { showToClient: !!showToClient } : {}),
    },
    include: { file: { select: { id: true, fileName: true, mimeType: true, originalName: true } } },
  });
  return Response.json(field);
});

export const DELETE = withErrorHandling(async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: _projectId } = await params;
  const { id } = await req.json();
  const field = await db.projectCustomField.findUnique({ where: { id }, select: { fileId: true } });
  await db.projectCustomField.delete({ where: { id } });
  if (field?.fileId) {
    const file = await db.projectFile.findUnique({ where: { id: field.fileId } });
    if (file) {
      await deleteObject(file.storagePath);
      await db.projectFile.delete({ where: { id: file.id } });
    }
  }
  return Response.json({ ok: true });
});
