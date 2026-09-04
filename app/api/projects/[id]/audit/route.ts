import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const action = req.nextUrl.searchParams.get("action");
  const logs = await db.auditLog.findMany({
    where: { projectId: id, ...(action ? { action: action as any } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });
  return Response.json(logs);
});
