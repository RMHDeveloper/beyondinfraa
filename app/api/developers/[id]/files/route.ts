import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { uploadObject } from "@/lib/storage";
import path from "path";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const files = await db.developerFile.findMany({
    where: { developerId: id },
    orderBy: { uploadedAt: "desc" },
  });
  return Response.json(files);
});

export const POST = withErrorHandling(async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const developer = await db.developer.findUnique({ where: { id }, select: { id: true } });
  if (!developer) return apiError("Not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name);
  const fileName = `${id}_${Date.now()}${ext}`;
  const storagePath = `developers/${id}/${fileName}`;
  await uploadObject(storagePath, buffer, file.type);

  const record = await db.developerFile.create({
    data: {
      developerId: id,
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
      entityType: "developer_file",
      entityId: record.id,
      after: { developerId: id, fileName: file.name, sizeBytes: buffer.length } as Prisma.InputJsonValue,
    },
  });

  return Response.json(record);
});
