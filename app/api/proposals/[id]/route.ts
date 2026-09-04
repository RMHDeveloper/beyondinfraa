import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const proposal = await db.proposal.findUnique({
    where: { id },
    select: {
      id: true, proposalNumber: true, status: true, createdAt: true, sentAt: true,
      introduction: true, remarks: true,
      contact: { select: { id: true, name: true, phone: true, email: true } },
      demandProject: { select: { id: true, projectNumber: true, category: { select: { id: true, name: true } } } },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, sortOrder: true, response: true,
          project: {
            select: {
              id: true, title: true, projectNumber: true, state: true, potentialScore: true,
              clientName: true, clientPhone: true,
              category:    { select: { id: true, name: true } },
              subcategory: { select: { id: true, name: true } },
              status:      { select: { id: true, name: true, color: true } },
            },
          },
        },
      },
      siteVisits: {
        orderBy: { scheduledAt: "desc" },
        select: {
          id: true, visitNumber: true, status: true, scheduledAt: true, notes: true,
          contact: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!proposal) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(proposal);
});

export const PATCH = withErrorHandling(async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { status, sentAt } = await req.json();
  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (sentAt !== undefined) data.sentAt = sentAt ? new Date(sentAt) : null;
  const proposal = await db.proposal.update({ where: { id }, data });
  return Response.json(proposal);
});
