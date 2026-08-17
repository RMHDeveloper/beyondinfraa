import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { orderedIds } = await req.json() as { orderedIds: string[] };

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return apiError("orderedIds required");

  await db.$transaction(
    orderedIds.map((fileId, i) =>
      db.projectFile.update({
        where: { id: fileId, projectId: id },
        data: { sortOrder: i },
      })
    )
  );

  return Response.json({ ok: true });
}
