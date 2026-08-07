import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function GET() {
  const rules = await db.scoringRule.findMany({ orderBy: { sortOrder: "asc" } });
  return Response.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { name, templateSlug, criterionKey, maxScore, questionLabel, matchValue, score, sortOrder } = await req.json();
  if (!name || !templateSlug || !matchValue || score === undefined) {
    return apiError("name, templateSlug, matchValue, score required");
  }
  const max = await db.scoringRule.aggregate({ _max: { sortOrder: true } });
  const rule = await db.scoringRule.create({
    data: {
      name, templateSlug, matchValue, score: Number(score),
      criterionKey: criterionKey || "",
      maxScore: maxScore ? Number(maxScore) : 0,
      questionLabel: questionLabel || "",
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : (max._max.sortOrder ?? 0) + 1,
    },
  });
  return Response.json(rule, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (!["SUPER_ADMIN", "OWNER"].includes(session.role)) return apiError("Forbidden", 403);

  const { id, name, templateSlug, criterionKey, maxScore, questionLabel, matchValue, score, sortOrder } = await req.json();
  if (!id) return apiError("id required");
  const rule = await db.scoringRule.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(templateSlug !== undefined && { templateSlug }),
      ...(criterionKey !== undefined && { criterionKey }),
      ...(maxScore !== undefined && { maxScore: Number(maxScore) }),
      ...(questionLabel !== undefined && { questionLabel }),
      ...(matchValue !== undefined && { matchValue }),
      ...(score !== undefined && { score: Number(score) }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
    },
  });
  return Response.json(rule);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return apiError("Forbidden", 403);
  const { id } = await req.json();
  await db.scoringRule.delete({ where: { id } });
  return Response.json({ ok: true });
}
