import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    select: {
      id: true, projectNumber: true, title: true, state: true, potentialScore: true,
      clientName: true, clientPhone: true, clientEmail: true, notes: true,
      leadSource: true, leadDate: true,
      createdAt: true,
      category:    { select: { id: true, name: true, slug: true } },
      subcategory: { select: { id: true, name: true } },
      status:      { select: { id: true, name: true, color: true } },
      assignee:    { select: { id: true, name: true } },
      referredBy:  { select: { id: true, name: true, phone: true } },
      tags:        { select: { tag: { select: { id: true, name: true, color: true } } } },
      template: {
        select: {
          id: true, name: true,
          groups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, sortOrder: true,
              group: {
                select: {
                  id: true, name: true, isShared: true,
                  questions: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                      id: true, label: true, fieldType: true, isRequired: true,
                      isInternal: true, options: true, unit: true, helpText: true,
                      conditionalJson: true, autoCalcJson: true, sortOrder: true,
                      showInPrint: true, showInPptExport: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: { select: { questionId: true, value: true, jsonValue: true } },
      deal: {
        select: {
          id: true, dealNumber: true, type: true, finalPrice: true, finalRent: true,
          closureDate: true, notes: true, createdAt: true,
          contact: { select: { id: true, name: true } },
          match: { select: { id: true, matchPct: true } },
          developerProposal: {
            select: { id: true, developer: { select: { contact: { select: { id: true, name: true } } } } },
          },
        },
      },
    },
  });

  if (!project) return apiError("Not found", 404);
  return Response.json(project);
});

export const DELETE = withErrorHandling(async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id }, select: { id: true } });
  if (!project) return apiError("Not found", 404);

  const deal = await db.deal.findUnique({ where: { projectId: id }, select: { id: true } });
  if (deal) return apiError("Cannot delete a project with a closed deal", 400);

  await db.$transaction([
    db.developerProposal.deleteMany({ where: { projectId: id } }),
    db.siteVisit.deleteMany({ where: { projectId: id } }),
    db.proposal.updateMany({ where: { demandProjectId: id }, data: { demandProjectId: null } }),
    db.project.delete({ where: { id } }),
  ]);

  return Response.json({ ok: true });
});

const FIELD_LABELS: Record<string, string> = {
  title: "Title", statusId: "Status", assigneeId: "Assignee",
  clientName: "Client Name", clientPhone: "Client Phone", clientEmail: "Client Email", notes: "Notes",
};

export const PATCH = withErrorHandling(async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["title", "statusId", "assigneeId", "clientName", "clientPhone", "clientEmail", "notes"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const before = await db.project.findUnique({
    where: { id },
    select: { title: true, statusId: true, assigneeId: true, clientName: true, clientPhone: true, clientEmail: true, notes: true },
  });

  const project = await db.project.update({ where: { id }, data });

  // Resolve statusId/assigneeId to human-readable names for the audit log instead of raw FKs.
  const [oldStatus, newStatus, oldAssignee, newAssignee] = await Promise.all([
    "statusId" in data && before?.statusId ? db.status.findUnique({ where: { id: before.statusId }, select: { name: true } }) : null,
    "statusId" in data && data.statusId ? db.status.findUnique({ where: { id: data.statusId as string }, select: { name: true } }) : null,
    "assigneeId" in data && before?.assigneeId ? db.user.findUnique({ where: { id: before.assigneeId }, select: { name: true } }) : null,
    "assigneeId" in data && data.assigneeId ? db.user.findUnique({ where: { id: data.assigneeId as string }, select: { name: true } }) : null,
  ]);

  const changes = Object.keys(data)
    .map((key) => {
      const beforeVal = key === "statusId" ? oldStatus?.name : key === "assigneeId" ? oldAssignee?.name : (before as Record<string, unknown> | null)?.[key];
      const afterVal = key === "statusId" ? newStatus?.name : key === "assigneeId" ? newAssignee?.name : data[key];
      return { label: FIELD_LABELS[key] ?? key, before: beforeVal || "—", after: afterVal || "—" };
    })
    .filter((c) => c.before !== c.after);

  if (changes.length > 0) {
    await db.auditLog.create({
      data: { projectId: id, userId: session.id, action: "UPDATE", entityType: "project", entityId: id, meta: { changes } as import("@prisma/client").Prisma.InputJsonValue },
    });
  }

  return Response.json(project);
});
