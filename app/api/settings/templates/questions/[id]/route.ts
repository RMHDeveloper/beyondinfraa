import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";

export const PATCH = withErrorHandling(async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { id } = await params;
  const { showInPrint, showInPptExport } = await req.json();

  const data: { showInPrint?: boolean; showInPptExport?: boolean } = {};
  if (typeof showInPrint === "boolean") data.showInPrint = showInPrint;
  if (typeof showInPptExport === "boolean") data.showInPptExport = showInPptExport;
  if (Object.keys(data).length === 0) return apiError("Nothing to update");

  const question = await db.question.update({ where: { id }, data });
  return Response.json(question);
});
