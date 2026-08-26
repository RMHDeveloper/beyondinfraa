import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Map category/subcategory to a scoring profile slug. Land Sale, Joint Venture, and
// Redevelopment each get their own profile (instead of one shared "special-projects"
// profile) because their templates carry genuinely different fields (e.g. only Land
// Sale has a Commission field, only Redevelopment has a Consent field).
function resolveProfile(categoryName: string, subcategoryName: string, templateName: string): string {
  const sub  = subcategoryName.toLowerCase();
  const tmpl = templateName.toLowerCase();

  if (sub.includes("redevelopment") || tmpl.includes("redevelopment")) return "redevelopment";
  if (sub.includes("joint venture") || tmpl.includes("joint venture")) return "joint-venture";
  if (sub.includes("land sale") || tmpl.includes("land sale")) return "land-sale";

  if (
    sub.includes("rent") || sub.includes("rental") || sub.includes("lease") ||
    tmpl.includes("rent") || tmpl.includes("rental") || tmpl.includes("lease")
  ) return "rental";

  return "selling-buying";
}

// Some criteria (Commission %, Road Width) are answered as a raw number rather than a
// preset dropdown option, so their matchValue is a range expression (">2%", "1 to 2%",
// ">=30ft") instead of an exact string. Detect and evaluate those numerically; fall back
// to the original exact/startsWith string match for genuine dropdown-backed criteria.
function parseLeadingNumber(s: string): number | null {
  const m = s.replace(/,/g, "").match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function isRangeExpression(matchValue: string): boolean {
  return /^[<>]=?\s*[\d.]/.test(matchValue) || /^[\d.]+\s*to\s*[\d.]+/i.test(matchValue);
}

function matchesRange(responseVal: string, matchValue: string): boolean {
  const num = parseLeadingNumber(responseVal);
  if (num === null) return false;
  const mv = matchValue.trim();

  const between = mv.match(/^([\d.]+)\s*to\s*([\d.]+)/i);
  if (between) return num >= parseFloat(between[1]) && num <= parseFloat(between[2]);

  const gte = mv.match(/^>=\s*([\d.]+)/); if (gte) return num >= parseFloat(gte[1]);
  const gt  = mv.match(/^>\s*([\d.]+)/);  if (gt)  return num > parseFloat(gt[1]);
  const lte = mv.match(/^<=\s*([\d.]+)/); if (lte) return num <= parseFloat(lte[1]);
  const lt  = mv.match(/^<\s*([\d.]+)/);  if (lt)  return num < parseFloat(lt[1]);
  return false;
}

function ruleMatches(responseVal: string, matchValue: string): boolean {
  if (isRangeExpression(matchValue)) return matchesRange(responseVal, matchValue);
  return responseVal === matchValue || responseVal.startsWith(matchValue);
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
  // "segment" isn't a question — it's the project's own category, used by the rental
  // profile to weight Industrial/Commercial/Residential rentals differently.
  responseMap.set("segment", project.category.name);

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
      if (responseVal && ruleMatches(responseVal, rule.matchValue)) {
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
