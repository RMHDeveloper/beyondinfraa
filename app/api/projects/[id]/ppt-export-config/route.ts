import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";

export const GET = withErrorHandling(async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, select: { pptExportConfig: true } });
  if (!project) return apiError("Not found", 404);
  return Response.json({ pptExportConfig: project.pptExportConfig });
});

export const PATCH = withErrorHandling(async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { pptExportConfig } = await req.json();

  const project = await db.project.update({
    where: { id },
    data: { pptExportConfig },
    select: { pptExportConfig: true },
  });

  return Response.json(project);
});
