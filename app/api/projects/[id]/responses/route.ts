import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, formatResponseValue, withErrorHandling } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const PATCH = withErrorHandling(async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id: projectId } = await params;

  const project = await db.project.findUnique({ where: { id: projectId }, select: { state: true } });
  if (!project) return apiError("Not found", 404);
  if (project.state === "ARCHIVED") return apiError("Project is archived", 403);
  if (project.state === "LOCKED" && session.role === "EMPLOYEE") return apiError("Project is locked", 403);

  const { questionId, value, jsonValue } = await req.json();
  if (!questionId) return apiError("questionId required");

  const question = await db.question.findUnique({ where: { id: questionId }, select: { label: true, fieldType: true } });
  if (!question) return apiError("Question not found", 404);

  const existing = await db.response.findUnique({ where: { projectId_questionId: { projectId, questionId } } });

  const beforeText = existing ? formatResponseValue(existing.value, existing.jsonValue, question.fieldType) : null;
  const afterText = formatResponseValue(value ?? null, jsonValue, question.fieldType);

  const response = await db.response.upsert({
    where: { projectId_questionId: { projectId, questionId } },
    update: {
      value: value ?? null,
      jsonValue: jsonValue !== undefined
        ? (jsonValue === null ? Prisma.JsonNull : jsonValue as Prisma.InputJsonValue)
        : undefined,
    },
    create: {
      projectId,
      questionId,
      value: value ?? null,
      jsonValue: jsonValue !== undefined
        ? (jsonValue === null ? Prisma.JsonNull : jsonValue as Prisma.InputJsonValue)
        : Prisma.JsonNull,
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
        meta: { label: question.label, before: beforeText, after: afterText } as Prisma.InputJsonValue,
      },
    });
  }

  // Recalculate potential score after every response save
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
