import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { uploadObject } from "@/lib/storage";
import path from "path";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const files = await db.developerProposalFile.findMany({
    where: { developerProposalId: id },
    orderBy: { uploadedAt: "desc" },
  });
  return Response.json(files);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const dp = await db.developerProposal.findUnique({ where: { id }, select: { id: true } });
  if (!dp) return apiError("Not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name);
  const fileName = `${id}_${Date.now()}${ext}`;
  const storagePath = `developer-proposals/${id}/${fileName}`;
  await uploadObject(storagePath, buffer, file.type);

  const record = await db.developerProposalFile.create({
    data: {
      developerProposalId: id,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: buffer.length,
      storagePath,
      uploadedBy: session.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "FILE_UPLOAD",
      entityType: "developer_proposal_file",
      entityId: record.id,
      after: { developerProposalId: id, fileName: file.name, sizeBytes: buffer.length } as Prisma.InputJsonValue,
    },
  });

  return Response.json(record);
}
