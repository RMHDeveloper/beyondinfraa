import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";

export const PATCH = withErrorHandling(async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { groupId, orderedIds } = await req.json() as { groupId: string; orderedIds: string[] };
  if (!groupId || !Array.isArray(orderedIds) || orderedIds.length === 0) return apiError("groupId and orderedIds required");

  await db.$transaction(
    orderedIds.map((questionId, i) =>
      db.question.update({
        where: { id: questionId, groupId },
        data: { sortOrder: i },
      })
    )
  );

  return Response.json({ ok: true });
});
