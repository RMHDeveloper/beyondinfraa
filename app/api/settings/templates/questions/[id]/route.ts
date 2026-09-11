import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { FieldType, Prisma } from "@prisma/client";

const FIELD_TYPES = Object.values(FieldType);

export const PATCH = withErrorHandling(async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { id } = await params;
  const body = await req.json();

  const existing = await db.question.findUnique({ where: { id }, select: { fieldType: true, options: true } });
  if (!existing) return apiError("Question not found", 404);

  const changingType = typeof body.fieldType === "string" && body.fieldType !== existing.fieldType;
  const removingOptions = Array.isArray(body.options) && existing.options.some((o) => !body.options.includes(o));

  if (changingType || removingOptions) {
    const answered = await db.response.count({ where: { questionId: id } });
    if (answered > 0) {
      return apiError(`Can't change field type or remove options — ${answered} project(s) have already answered this field. Archive it instead.`, 409);
    }
  }

  const data: Prisma.QuestionUpdateInput = {};
  if (typeof body.label === "string") data.label = body.label;
  if (typeof body.fieldType === "string") {
    if (!FIELD_TYPES.includes(body.fieldType)) return apiError("Invalid fieldType");
    data.fieldType = body.fieldType;
  }
  if (Array.isArray(body.options)) data.options = body.options;
  if (typeof body.isRequired === "boolean") data.isRequired = body.isRequired;
  if (typeof body.isInternal === "boolean") data.isInternal = body.isInternal;
  if (typeof body.showInPrint === "boolean") data.showInPrint = body.showInPrint;
  if (typeof body.showInPptExport === "boolean") data.showInPptExport = body.showInPptExport;
  if (typeof body.isArchived === "boolean") data.isArchived = body.isArchived;
  if (typeof body.unit === "string" || body.unit === null) data.unit = body.unit;
  if (typeof body.helpText === "string" || body.helpText === null) data.helpText = body.helpText;
  if (Object.keys(data).length === 0) return apiError("Nothing to update");

  const question = await db.question.update({ where: { id }, data });
  return Response.json(question);
});

export const DELETE = withErrorHandling(async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { id } = await params;
  const answered = await db.response.count({ where: { questionId: id } });
  if (answered > 0) {
    return apiError(`Can't delete — ${answered} project(s) have already answered this field. Archive it instead.`, 409);
  }

  await db.question.delete({ where: { id } });
  return Response.json({ ok: true });
});
