import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ReqForScoring = {
  categoryId: string;
  budgetMin?: number | null; budgetMax?: number | null;
  rentMin?: number | null; rentMax?: number | null;
  areaMin?: number | null; areaMax?: number | null;
  bhk?: string | null; furnishing?: string | null;
  preferredLocations?: unknown;
};

type ProjectForScoring = {
  id: string;
  categoryId: string;
  responses: { question: { label: string }; value: string | null }[];
};

function rMap(project: ProjectForScoring): Record<string, string> {
  return Object.fromEntries(project.responses.map(r => [r.question.label.toLowerCase(), r.value ?? ""]));
}

function scoreReq(req: ReqForScoring, project: ProjectForScoring, mode: "buyer" | "tenant") {
  if (project.categoryId !== req.categoryId) return null;

  const map = rMap(project);
  const matched: string[] = [];
  const missed: string[] = [];

  if (mode === "buyer") {
    const price = parseFloat(
      map["price expected — min"] ?? map["asking price"] ?? map["sale price"] ?? map["price"] ?? "0"
    );
    if (price > 0) {
      const ok = (!req.budgetMin || price >= req.budgetMin * 0.9) &&
                 (!req.budgetMax || price <= req.budgetMax * 1.1);
      ok ? matched.push("Budget") : missed.push("Budget");
    } else {
      missed.push("Budget");
    }
  } else {
    const rent = parseFloat(map["monthly rent"] ?? map["rent"] ?? map["expected rent"] ?? "0");
    if (rent > 0) {
      const ok = (!req.rentMin || rent >= req.rentMin) && (!req.rentMax || rent <= req.rentMax);
      ok ? matched.push("Rent") : missed.push("Rent");
    } else {
      missed.push("Rent");
    }
  }

  const area = parseFloat(
    map["land area as per sale deed"] ?? map["built-up area"] ?? map["area"] ?? map["plot area"] ?? map["carpet area"] ?? "0"
  );
  if (area > 0 && (req.areaMin || req.areaMax)) {
    const ok = (!req.areaMin || area >= req.areaMin * 0.9) && (!req.areaMax || area <= req.areaMax * 1.1);
    ok ? matched.push("Area") : missed.push("Area");
  }

  if (mode === "buyer" && req.bhk) {
    const propBhk = map["bhk"] ?? map["bedrooms"] ?? "";
    propBhk.toLowerCase().includes(req.bhk.toLowerCase())
      ? matched.push("BHK") : missed.push("BHK");
  }

  if (req.furnishing && req.furnishing !== "Any") {
    const propFurn = map["furnishing"] ?? map["furnishing status"] ?? "";
    propFurn.toLowerCase().includes(req.furnishing.toLowerCase())
      ? matched.push("Furnishing") : missed.push("Furnishing");
  }

  const locs = Array.isArray(req.preferredLocations) ? req.preferredLocations as string[] : [];
  if (locs.length > 0) {
    const locality = (map["area / locality"] ?? map["locality"] ?? map["location"] ?? "").toLowerCase();
    const hit = locs.some(l => locality.includes(l.toLowerCase()));
    hit ? matched.push("Location") : missed.push("Location");
  }

  const total = matched.length + missed.length;
  const pct = total > 0 ? Math.round((matched.length / total) * 100) : 50;
  return { pct, matched, missed };
}

export async function POST() {
  await requireSession();

  const [projects, buyerReqs, tenantReqs] = await Promise.all([
    db.project.findMany({
      where: { state: "OPEN" },
      select: {
        id: true, categoryId: true,
        responses: { select: { value: true, question: { select: { label: true } } } },
      },
    }),
    db.buyerRequirement.findMany({ where: { status: { in: ["NEW", "ACTIVE"] } } }),
    db.tenantRequirement.findMany({ where: { status: { in: ["NEW", "ACTIVE"] } } }),
  ]);

  const projectIds = projects.map(p => p.id);

  // Load all existing matches in one query — avoid N×M findFirst calls
  const existingMatches = await db.match.findMany({
    where: { projectId: { in: projectIds } },
    select: { projectId: true, buyerRequirementId: true, tenantRequirementId: true },
  });
  const existingSet = new Set(
    existingMatches.map(m => `${m.projectId}:${m.buyerRequirementId ?? ""}:${m.tenantRequirementId ?? ""}`)
  );

  type MatchInput = { projectId: string; buyerRequirementId?: string; tenantRequirementId?: string; matchPct: number; criteriaMatched: string[]; criteriaMissed: string[] };
  const toCreate: MatchInput[] = [];

  for (const req of buyerReqs) {
    for (const project of projects) {
      const key = `${project.id}:${req.id}:`;
      if (existingSet.has(key)) continue;
      const result = scoreReq(req, project, "buyer");
      if (!result) continue;
      toCreate.push({ projectId: project.id, buyerRequirementId: req.id, matchPct: result.pct, criteriaMatched: result.matched, criteriaMissed: result.missed });
    }
  }

  for (const req of tenantReqs) {
    for (const project of projects) {
      const key = `${project.id}::${req.id}`;
      if (existingSet.has(key)) continue;
      const result = scoreReq(req, project, "tenant");
      if (!result) continue;
      toCreate.push({ projectId: project.id, tenantRequirementId: req.id, matchPct: result.pct, criteriaMatched: result.matched, criteriaMissed: result.missed });
    }
  }

  if (toCreate.length > 0) {
    await db.match.createMany({ data: toCreate });
  }

  return Response.json({ ok: true, created: toCreate.length });
}
