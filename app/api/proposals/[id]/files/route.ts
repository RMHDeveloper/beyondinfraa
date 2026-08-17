import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "proposals");

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const files = await db.proposalFile.findMany({
    where: { proposalId: id },
    orderBy: { uploadedAt: "desc" },
  });
  return Response.json(files);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const proposal = await db.proposal.findUnique({ where: { id }, select: { id: true } });
  if (!proposal) return apiError("Not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name);
  const fileName = `${id}_${Date.now()}${ext}`;
  const proposalDir = path.join(UPLOAD_DIR, id);
  await mkdir(proposalDir, { recursive: true });
  await writeFile(path.join(proposalDir, fileName), buffer);
  const storagePath = `${id}/${fileName}`;

  const record = await db.proposalFile.create({
    data: {
      proposalId: id,
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
      entityType: "proposal_file",
      entityId: record.id,
      after: { proposalId: id, fileName: file.name, sizeBytes: buffer.length } as Prisma.InputJsonValue,
    },
  });

  return Response.json(record);
}
