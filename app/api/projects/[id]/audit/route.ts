import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const logs = await db.auditLog.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json(logs);
}
