import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { readFile, unlink } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "proposals");

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  await requireSession();
  const { fileId } = await params;

  const file = await db.proposalFile.findUnique({ where: { id: fileId } });
  if (!file) return apiError("Not found", 404);

  const filePath = path.join(UPLOAD_DIR, file.storagePath);
  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return apiError("File not found on disk", 404);
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

  const file = await db.proposalFile.findUnique({ where: { id: fileId } });
  if (!file) return apiError("Not found", 404);

  const filePath = path.join(UPLOAD_DIR, file.storagePath);
  try { await unlink(filePath); } catch { /* file may already be gone */ }

  await db.proposalFile.delete({ where: { id: fileId } });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "FILE_DELETE",
      entityType: "proposal_file",
      entityId: fileId,
      before: { proposalId: id, fileName: file.originalName } as import("@prisma/client").Prisma.InputJsonValue,
    },
  });

  return Response.json({ ok: true });
}
