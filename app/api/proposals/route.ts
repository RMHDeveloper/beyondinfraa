import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();
  const proposals = await db.proposal.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, proposalNumber: true, status: true, createdAt: true, sentAt: true,
      contact: { select: { id: true, name: true } },
      items: {
        select: {
          id: true, sortOrder: true, response: true,
          project: { select: { id: true, title: true, projectNumber: true, category: { select: { name: true } } } },
        },
      },
      buyerRequirement: { select: { reqNumber: true } },
      tenantRequirement: { select: { reqNumber: true } },
    },
  });
  return Response.json(proposals);
}
