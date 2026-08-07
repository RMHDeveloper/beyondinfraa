import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    select: {
      id: true, projectNumber: true, title: true, state: true, potentialScore: true,
      clientName: true, clientPhone: true, clientEmail: true, notes: true,
      createdAt: true,
      category:    { select: { id: true, name: true, slug: true } },
      subcategory: { select: { id: true, name: true } },
      status:      { select: { id: true, name: true, color: true } },
      assignee:    { select: { id: true, name: true } },
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
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: { select: { questionId: true, value: true, jsonValue: true } },
    },
  });

  if (!project) return apiError("Not found", 404);
  return Response.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["title", "statusId", "assigneeId", "clientName", "clientPhone", "clientEmail", "notes"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const project = await db.project.update({ where: { id }, data });

  await db.auditLog.create({
    data: { projectId: id, userId: session.id, action: "UPDATE", entityType: "project", entityId: id, after: data as import("@prisma/client").Prisma.InputJsonValue },
  });

  return Response.json(project);
}
