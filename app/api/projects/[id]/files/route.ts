import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { uploadObject } from "@/lib/storage";
import path from "path";
import { FileKind, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const kindParam = req.nextUrl.searchParams.get("kind");
  const kind = kindParam === "GALLERY_IMAGE" ? FileKind.GALLERY_IMAGE
    : kindParam === "CUSTOM_FIELD_IMAGE" ? FileKind.CUSTOM_FIELD_IMAGE
    : kindParam === "PRINT_IMAGE" ? FileKind.PRINT_IMAGE
    : kindParam === "DOCUMENT" ? FileKind.DOCUMENT : undefined;

  const sortedKinds: FileKind[] = [FileKind.GALLERY_IMAGE, FileKind.CUSTOM_FIELD_IMAGE, FileKind.PRINT_IMAGE];
  const files = await db.projectFile.findMany({
    where: { projectId: id, ...(kind ? { kind } : {}) },
    orderBy: kind && sortedKinds.includes(kind) ? { sortOrder: "asc" } : { uploadedAt: "desc" },
  });
  return Response.json(files);
});

export const POST = withErrorHandling(async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id }, select: { state: true } });
  if (!project) return apiError("Not found", 404);
  if (project.state === "ARCHIVED") return apiError("Project is archived", 403);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const questionId = formData.get("questionId") as string | null;
  const category = formData.get("category") as string | null;
  const kindRaw = formData.get("kind");
  const kind = kindRaw === "GALLERY_IMAGE" ? FileKind.GALLERY_IMAGE
    : kindRaw === "CUSTOM_FIELD_IMAGE" ? FileKind.CUSTOM_FIELD_IMAGE
    : kindRaw === "PRINT_IMAGE" ? FileKind.PRINT_IMAGE
    : FileKind.DOCUMENT;

  if (!file) return apiError("No file provided");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name);
  const fileName = `${id}_${Date.now()}${ext}`;
  const storagePath = `${id}/${fileName}`;
  await uploadObject(storagePath, buffer, file.type);

  const sortOrder = kind === FileKind.GALLERY_IMAGE || kind === FileKind.CUSTOM_FIELD_IMAGE || kind === FileKind.PRINT_IMAGE
    ? await db.projectFile.count({ where: { projectId: id, kind } })
    : 0;

  const record = await db.projectFile.create({
    data: {
      projectId: id,
      questionId: questionId ?? null,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: buffer.length,
      storagePath,
      kind,
      category: kind === FileKind.DOCUMENT ? (category || null) : null,
      sortOrder,
      uploadedBy: session.id,
    },
  });

  await db.auditLog.create({
    data: {
      projectId: id,
      userId: session.id,
      action: "FILE_UPLOAD",
      entityType: "file",
      entityId: record.id,
      after: { fileName: file.name, sizeBytes: buffer.length } as Prisma.InputJsonValue,
    },
  });

  return Response.json(record);
});
