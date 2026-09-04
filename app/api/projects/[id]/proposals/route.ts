import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const items = await db.proposalProperty.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      response: true,
      createdAt: true,
      proposal: {
        select: {
          id: true,
          proposalNumber: true,
          status: true,
          sentAt: true,
          createdAt: true,
          contact: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  return Response.json(items);
});
