import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const files = await db.projectFile.findMany({
    where: { projectId: id },
    orderBy: { uploadedAt: "desc" },
  });
  return Response.json(files);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id }, select: { state: true } });
  if (!project) return apiError("Not found", 404);
  if (project.state === "ARCHIVED") return apiError("Project is archived", 403);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const questionId = formData.get("questionId") as string | null;

  if (!file) return apiError("No file provided");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name);
  const fileName = `${id}_${Date.now()}${ext}`;
  const projectDir = path.join(UPLOAD_DIR, id);
  await mkdir(projectDir, { recursive: true });
  await writeFile(path.join(projectDir, fileName), buffer);
  const storagePath = `${id}/${fileName}`;

  const record = await db.projectFile.create({
    data: {
      projectId: id,
      questionId: questionId ?? null,
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
      projectId: id,
      userId: session.id,
      action: "FILE_UPLOAD",
      entityType: "file",
      entityId: record.id,
      after: { fileName: file.name, sizeBytes: buffer.length } as Prisma.InputJsonValue,
    },
  });

  return Response.json(record);
}
