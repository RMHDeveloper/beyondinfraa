import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { scoreDemandAgainstListing, isDemandSide, type ProjectForScoring } from "@/lib/matching";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Same scoring logic as /api/matching/run but returns results without saving
type ScoringProject = ProjectForScoring & { title: string; projectNumber: string };

export const POST = withErrorHandling(async function POST(req: Request) {
  await requireSession();
  const body = await req.json().catch(() => ({}));

  // Optional: scope to a specific listing projectId or demand demandProjectId
  const { projectId, demandProjectId } = body as {
    projectId?: string; demandProjectId?: string;
  };

  const projectSelect = {
    id: true, title: true, projectNumber: true, categoryId: true,
    subcategory: { select: { name: true } },
    responses: { select: { value: true, question: { select: { label: true } } } },
  };

  const [allProjects, existingMatches] = await Promise.all([
    db.project.findMany({
      where: {
        state: "OPEN",
        ...(projectId ? { id: projectId } : {}),
        ...(demandProjectId ? { id: demandProjectId } : {}),
      },
      take: 500,
      select: projectSelect,
    }),
    db.match.findMany({
      where: { ...(projectId ? { projectId } : {}) },
      take: 2000,
      select: { id: true, projectId: true, demandProjectId: true, confirmedAt: true },
    }),
  ]);

  // When scoping by one side only, we still need the full candidate pool for the other side.
  let demandProjects: ScoringProject[];
  let listingProjects: ScoringProject[];

  if (demandProjectId) {
    demandProjects = allProjects as ScoringProject[];
    listingProjects = (await db.project.findMany({
      where: { state: "OPEN" }, take: 500, select: projectSelect,
    }) as ScoringProject[]).filter(p => !isDemandSide(p.subcategory.name));
  } else if (projectId) {
    listingProjects = allProjects as ScoringProject[];
    demandProjects = (await db.project.findMany({
      where: { state: "OPEN" }, take: 500, select: projectSelect,
    }) as ScoringProject[]).filter(p => isDemandSide(p.subcategory.name));
  } else {
    demandProjects = (allProjects as ScoringProject[]).filter(p => isDemandSide(p.subcategory.name));
    listingProjects = (allProjects as ScoringProject[]).filter(p => !isDemandSide(p.subcategory.name));
  }

  const confirmedKey = (pid: string, dpid: string | null) => `${pid}:${dpid ?? ""}`;
  const confirmedSet = new Set(
    existingMatches.filter(m => m.confirmedAt).map(m => confirmedKey(m.projectId, m.demandProjectId))
  );
  const existingMatchMap = Object.fromEntries(
    existingMatches.map(m => [confirmedKey(m.projectId, m.demandProjectId), m.id])
  );

  type Suggestion = {
    projectId: string; projectTitle: string; projectNumber: string;
    demandProjectId: string; demandProjectTitle: string; demandProjectNumber: string;
    pct: number; matched: string[]; missed: string[];
    alreadyConfirmed: boolean; existingMatchId: string | null;
  };

  const suggestions: Suggestion[] = [];

  for (const demand of demandProjects) {
    for (const listing of listingProjects) {
      const result = scoreDemandAgainstListing(demand, listing);
      if (!result) continue;
      const key = confirmedKey(listing.id, demand.id);
      suggestions.push({
        projectId: listing.id, projectTitle: listing.title, projectNumber: listing.projectNumber,
        demandProjectId: demand.id, demandProjectTitle: demand.title, demandProjectNumber: demand.projectNumber,
        pct: result.pct, matched: result.matched, missed: result.missed,
        alreadyConfirmed: confirmedSet.has(key),
        existingMatchId: existingMatchMap[key] ?? null,
      });
    }
  }

  suggestions.sort((a, b) => b.pct - a.pct);
  return Response.json(suggestions);
});
