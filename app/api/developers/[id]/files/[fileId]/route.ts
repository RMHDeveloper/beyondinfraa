import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { getObject, deleteObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  await requireSession();
  const { fileId } = await params;

  const file = await db.developerFile.findUnique({ where: { id: fileId } });
  if (!file) return apiError("Not found", 404);

  let buffer: Buffer;
  try {
    buffer = await getObject(file.storagePath);
  } catch {
    return apiError("File not found in storage", 404);
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.originalName}"`,
    },
  });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await requireSession();
  const { id, fileId } = await params;

  const file = await db.developerFile.findUnique({ where: { id: fileId } });
  if (!file) return apiError("Not found", 404);

  await deleteObject(file.storagePath);

  await db.developerFile.delete({ where: { id: fileId } });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "FILE_DELETE",
      entityType: "developer_file",
      entityId: fileId,
      before: { developerId: id, fileName: file.originalName } as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  return Response.json({ ok: true });
}
