import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Same scoring logic as /api/matching/run but returns results without saving
type ReqForScoring = {
  id: string; categoryId: string;
  budgetMin?: number | null; budgetMax?: number | null;
  rentMin?: number | null; rentMax?: number | null;
  areaMin?: number | null; areaMax?: number | null;
  bhk?: string | null; furnishing?: string | null;
  preferredLocations?: unknown;
};
type ProjectForScoring = {
  id: string; title: string; projectNumber: string; categoryId: string;
  responses: { question: { label: string }; value: string | null }[];
};

function rMap(p: ProjectForScoring) {
  return Object.fromEntries(p.responses.map(r => [r.question.label.toLowerCase(), r.value ?? ""]));
}

function scoreReq(req: ReqForScoring, project: ProjectForScoring, mode: "buyer" | "tenant") {
  if (project.categoryId !== req.categoryId) return null;
  const map = rMap(project);
  const matched: string[] = [], missed: string[] = [];

  if (mode === "buyer") {
    const price = parseFloat(map["price expected — min"] ?? map["asking price"] ?? map["sale price"] ?? map["price"] ?? "0");
    if (price > 0) {
      const ok = (!req.budgetMin || price >= req.budgetMin * 0.9) && (!req.budgetMax || price <= req.budgetMax * 1.1);
      ok ? matched.push("Budget") : missed.push("Budget");
    } else missed.push("Budget");
  } else {
    const rent = parseFloat(map["monthly rent"] ?? map["rent"] ?? map["expected rent"] ?? "0");
    if (rent > 0) {
      const ok = (!req.rentMin || rent >= req.rentMin) && (!req.rentMax || rent <= req.rentMax);
      ok ? matched.push("Rent") : missed.push("Rent");
    } else missed.push("Rent");
  }

  const area = parseFloat(map["land area as per sale deed"] ?? map["built-up area"] ?? map["area"] ?? map["plot area"] ?? map["carpet area"] ?? "0");
  if (area > 0 && (req.areaMin || req.areaMax)) {
    const ok = (!req.areaMin || area >= req.areaMin * 0.9) && (!req.areaMax || area <= req.areaMax * 1.1);
    ok ? matched.push("Area") : missed.push("Area");
  }

  if (mode === "buyer" && req.bhk) {
    const propBhk = map["bhk"] ?? map["bedrooms"] ?? "";
    propBhk.toLowerCase().includes(req.bhk.toLowerCase()) ? matched.push("BHK") : missed.push("BHK");
  }

  if (req.furnishing && req.furnishing !== "Any") {
    const propFurn = map["furnishing"] ?? map["furnishing status"] ?? "";
    propFurn.toLowerCase().includes(req.furnishing.toLowerCase()) ? matched.push("Furnishing") : missed.push("Furnishing");
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

export async function POST(req: Request) {
  await requireSession();
  const body = await req.json().catch(() => ({}));

  // Optional: scope to a specific projectId or requirementId
  const { projectId, buyerRequirementId, tenantRequirementId } = body as {
    projectId?: string; buyerRequirementId?: string; tenantRequirementId?: string;
  };

  const [projects, buyerReqs, tenantReqs, existingMatches] = await Promise.all([
    db.project.findMany({
      where: { state: "OPEN", ...(projectId ? { id: projectId } : {}) },
      take: 500,
      select: {
        id: true, title: true, projectNumber: true, categoryId: true,
        responses: { select: { value: true, question: { select: { label: true } } } },
      },
    }),
    db.buyerRequirement.findMany({
      where: {
        status: { in: ["NEW", "ACTIVE"] },
        ...(buyerRequirementId ? { id: buyerRequirementId } : {}),
      },
      take: 500,
      select: {
        id: true, categoryId: true,
        budgetMin: true, budgetMax: true, areaMin: true, areaMax: true,
        bhk: true, furnishing: true, preferredLocations: true,
      },
    }),
    db.tenantRequirement.findMany({
      where: {
        status: { in: ["NEW", "ACTIVE"] },
        ...(tenantRequirementId ? { id: tenantRequirementId } : {}),
      },
      take: 500,
      select: {
        id: true, categoryId: true,
        rentMin: true, rentMax: true, areaMin: true, areaMax: true,
        furnishing: true, preferredLocations: true,
      },
    }),
    db.match.findMany({
      where: { ...(projectId ? { projectId } : {}) },
      take: 2000,
      select: { id: true, projectId: true, buyerRequirementId: true, tenantRequirementId: true, confirmedAt: true },
    }),
  ]);
  const confirmedKey = (pid: string, brid: string | null, trid: string | null) =>
    `${pid}:${brid ?? ""}:${trid ?? ""}`;
  const confirmedSet = new Set(
    existingMatches.filter(m => m.confirmedAt).map(m => confirmedKey(m.projectId, m.buyerRequirementId, m.tenantRequirementId))
  );
  const existingMatchMap = Object.fromEntries(
    existingMatches.map(m => [confirmedKey(m.projectId, m.buyerRequirementId, m.tenantRequirementId), m.id])
  );

  type Suggestion = {
    projectId: string; projectTitle: string; projectNumber: string;
    reqId: string; reqType: "buyer" | "tenant";
    pct: number; matched: string[]; missed: string[];
    alreadyConfirmed: boolean; existingMatchId: string | null;
  };

  const suggestions: Suggestion[] = [];

  for (const req of buyerReqs) {
    for (const project of projects) {
      const result = scoreReq(req, project as unknown as ProjectForScoring, "buyer");
      if (!result) continue;
      const key = confirmedKey(project.id, req.id, null);
      suggestions.push({
        projectId: project.id, projectTitle: project.title, projectNumber: project.projectNumber,
        reqId: req.id, reqType: "buyer",
        pct: result.pct, matched: result.matched, missed: result.missed,
        alreadyConfirmed: confirmedSet.has(key),
        existingMatchId: existingMatchMap[key] ?? null,
      });
    }
  }

  for (const req of tenantReqs) {
    for (const project of projects) {
      const result = scoreReq(req, project as unknown as ProjectForScoring, "tenant");
      if (!result) continue;
      const key = confirmedKey(project.id, null, req.id);
      suggestions.push({
        projectId: project.id, projectTitle: project.title, projectNumber: project.projectNumber,
        reqId: req.id, reqType: "tenant",
        pct: result.pct, matched: result.matched, missed: result.missed,
        alreadyConfirmed: confirmedSet.has(key),
        existingMatchId: existingMatchMap[key] ?? null,
      });
    }
  }

  suggestions.sort((a, b) => b.pct - a.pct);
  return Response.json(suggestions);
}
