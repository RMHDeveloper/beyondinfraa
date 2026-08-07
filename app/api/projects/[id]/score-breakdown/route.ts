import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Map category/subcategory to a scoring profile slug.
function resolveProfile(categoryName: string, subcategoryName: string, templateName: string): string {
  const cat  = categoryName.toLowerCase();
  const sub  = subcategoryName.toLowerCase();
  const tmpl = templateName.toLowerCase();

  if (
    cat.includes("special") ||
    sub.includes("redevelopment") || sub.includes("joint venture") || sub.includes("land sale") ||
    tmpl.includes("redevelopment") || tmpl.includes("land sale") || tmpl.includes("joint venture")
  ) return "special-projects";

  if (
    sub.includes("rent") || sub.includes("rental") || sub.includes("lease") ||
    tmpl.includes("rent") || tmpl.includes("rental") || tmpl.includes("lease")
  ) return "rental";

  return "selling-buying";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id: projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      category:    { select: { name: true } },
      subcategory: { select: { name: true } },
      template:    { select: { name: true } },
      responses: {
        select: { value: true, question: { select: { label: true } } },
      },
    },
  });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const profile = resolveProfile(
    project.category.name,
    project.subcategory?.name ?? "",
    project.template?.name ?? "",
  );

  const rules = await db.scoringRule.findMany({
    where: { templateSlug: profile },
    orderBy: { sortOrder: "asc" },
  });

  // Build a map from question label (lowercased) → response value
  const responseMap = new Map<string, string>();
  for (const r of project.responses) {
    if (r.question?.label && r.value) {
      responseMap.set(r.question.label.toLowerCase().trim(), r.value.trim());
    }
  }

  // For each criterion group, find which rule (if any) matched
  // and record the earned score. totalPossible = sum of maxScore per unique criterion.
  const criterionSeen = new Set<string>();
  const breakdown: { name: string; score: number; maxScore: number; matched: boolean; criterionKey: string }[] = [];
  let totalEarned = 0;
  let totalPossible = 0;

  // Group rules by criterionKey, keep insertion order
  const byKey = new Map<string, typeof rules>();
  for (const rule of rules) {
    const key = rule.criterionKey || rule.name;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(rule);
  }

  for (const [key, criterionRules] of byKey) {
    // Only count each criterion's maxScore once toward totalPossible
    const criterionMax = criterionRules[0].maxScore;
    if (!criterionSeen.has(key)) {
      totalPossible += criterionMax;
      criterionSeen.add(key);
    }

    // Find the first matching rule for this criterion
    let matched: typeof rules[0] | null = null;
    for (const rule of criterionRules) {
      const label = (rule.questionLabel || "").toLowerCase().trim();
      const responseVal = responseMap.get(label) ?? "";
      if (responseVal === rule.matchValue || responseVal.startsWith(rule.matchValue)) {
        matched = rule;
        break;
      }
    }

    const earnedScore = matched ? matched.score : 0;
    totalEarned += earnedScore;

    // Emit one row per criterion (the matched rule name, or the first rule's criterion label)
    breakdown.push({
      name: matched ? matched.name : criterionRules[0].name.replace(/\s*–.*$/, ""),
      score: earnedScore,
      maxScore: criterionMax,
      matched: matched !== null,
      criterionKey: key,
    });
  }

  const potentialScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

  // Fire-and-forget score persist — don't await so it doesn't block the response
  if (potentialScore !== null) {
    db.project.update({ where: { id: projectId }, data: { potentialScore } }).catch(() => {});
  }

  return Response.json({
    profile,
    breakdown,
    totalEarned,
    totalPossible,
    potentialScore,
  });
}
