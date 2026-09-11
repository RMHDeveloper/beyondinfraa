import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { FieldType } from "@prisma/client";

const FIELD_TYPES = Object.values(FieldType);

export const POST = withErrorHandling(async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const body = await req.json();
  const { groupId, label, fieldType } = body;
  if (!groupId || !label || !fieldType) return apiError("groupId, label and fieldType are required");
  if (!FIELD_TYPES.includes(fieldType)) return apiError("Invalid fieldType");

  const maxSort = await db.question.aggregate({ where: { groupId }, _max: { sortOrder: true } });

  const question = await db.question.create({
    data: {
      groupId,
      label,
      fieldType,
      isRequired: body.isRequired === true,
      isInternal: body.isInternal === true,
      options: Array.isArray(body.options) ? body.options : [],
      unit: body.unit || null,
      helpText: body.helpText || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
  return Response.json(question);
});
