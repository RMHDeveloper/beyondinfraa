import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, formatResponseValue, withErrorHandling } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async function POST(_: NextRequest, { params }: { params: Promise<{ id: string; auditId: string }> }) {
  const session = await requireSession();
  const { id: projectId, auditId } = await params;

  const project = await db.project.findUnique({ where: { id: projectId }, select: { state: true } });
  if (!project) return apiError("Not found", 404);
  if (project.state === "ARCHIVED") return apiError("Project is archived", 403);
  if (project.state === "LOCKED" && session.role === "EMPLOYEE") return apiError("Project is locked", 403);

  const entry = await db.auditLog.findUnique({ where: { id: auditId } });
  if (!entry || entry.projectId !== projectId) return apiError("Log entry not found", 404);
  if (entry.entityType !== "response" || !entry.entityId) return apiError("This entry cannot be restored", 400);

  const meta = entry.meta as Record<string, unknown> | null;
  const beforeRaw = meta?.beforeRaw as { value: string | null; jsonValue: unknown } | undefined;
  if (!beforeRaw) return apiError("No earlier value recorded for this entry", 400);

  const questionId = entry.entityId;
  const question = await db.question.findUnique({ where: { id: questionId }, select: { label: true, fieldType: true } });
  if (!question) return apiError("Question not found", 404);

  const existing = await db.response.findUnique({ where: { projectId_questionId: { projectId, questionId } } });
  const beforeText = existing ? formatResponseValue(existing.value, existing.jsonValue, question.fieldType) : null;
  const afterText = formatResponseValue(beforeRaw.value, beforeRaw.jsonValue, question.fieldType);

  const response = await db.response.upsert({
    where: { projectId_questionId: { projectId, questionId } },
    update: {
      value: beforeRaw.value,
      jsonValue: beforeRaw.jsonValue === null || beforeRaw.jsonValue === undefined
        ? Prisma.JsonNull
        : (beforeRaw.jsonValue as Prisma.InputJsonValue),
    },
    create: {
      projectId,
      questionId,
      value: beforeRaw.value,
      jsonValue: beforeRaw.jsonValue === null || beforeRaw.jsonValue === undefined
        ? Prisma.JsonNull
        : (beforeRaw.jsonValue as Prisma.InputJsonValue),
    },
  });

  if (beforeText !== afterText) {
    await db.auditLog.create({
      data: {
        projectId,
        userId: session.id,
        action: "UPDATE",
        entityType: "response",
        entityId: questionId,
        meta: {
          label: question.label,
          before: beforeText,
          after: afterText,
          beforeRaw: { value: existing?.value ?? null, jsonValue: existing?.jsonValue ?? null },
          afterRaw: beforeRaw,
          restoredFromAuditId: auditId,
        } as Prisma.InputJsonValue,
      },
    });
  }

  await recalcScore(projectId);

  return Response.json(response);
});

async function recalcScore(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      template: { select: { name: true, subcategory: { select: { slug: true } } } },
      responses: { select: { value: true } },
    },
  });
  if (!project) return;

  const templateSlug = project.template.name.toLowerCase().replace(/\s+/g, "-");
  const subcategorySlug = project.template.subcategory?.slug ?? "";

  const [rules, responseValues] = await Promise.all([
    db.scoringRule.findMany({
      where: { templateSlug: { in: ["all", subcategorySlug, templateSlug] } },
      select: { templateSlug: true, matchValue: true, score: true },
    }),
    Promise.resolve(new Set(project.responses.map(r => r.value ?? ""))),
  ]);

  let score = 0;
  for (const rule of rules) {
    const matched = [...responseValues].some(val =>
      val === rule.matchValue || val.startsWith(rule.matchValue)
    );
    if (matched) score += rule.score;
  }

  await db.project.update({ where: { id: projectId }, data: { potentialScore: score } });
}
