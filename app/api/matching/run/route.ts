import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { scoreDemandAgainstListing, isDemandSide, type ProjectForScoring } from "@/lib/matching";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async function POST() {
  await requireSession();

  const projects = await db.project.findMany({
    where: { state: "OPEN" },
    select: {
      id: true, categoryId: true,
      subcategory: { select: { name: true } },
      responses: { select: { value: true, question: { select: { label: true } } } },
    },
  });

  const demandProjects = (projects as ProjectForScoring[]).filter(p => isDemandSide(p.subcategory.name));
  const listingProjects = (projects as ProjectForScoring[]).filter(p => !isDemandSide(p.subcategory.name));

  const listingIds = listingProjects.map(p => p.id);

  // Load all existing matches in one query — avoid N×M findFirst calls
  const existingMatches = await db.match.findMany({
    where: { projectId: { in: listingIds } },
    select: { projectId: true, demandProjectId: true },
  });
  const existingSet = new Set(
    existingMatches.map(m => `${m.projectId}:${m.demandProjectId ?? ""}`)
  );

  type MatchInput = { projectId: string; demandProjectId: string; matchPct: number; criteriaMatched: string[]; criteriaMissed: string[] };
  const toCreate: MatchInput[] = [];

  for (const demand of demandProjects) {
    for (const listing of listingProjects) {
      const key = `${listing.id}:${demand.id}`;
      if (existingSet.has(key)) continue;
      const result = scoreDemandAgainstListing(demand, listing);
      if (!result) continue;
      toCreate.push({ projectId: listing.id, demandProjectId: demand.id, matchPct: result.pct, criteriaMatched: result.matched, criteriaMissed: result.missed });
    }
  }

  if (toCreate.length > 0) {
    await db.match.createMany({ data: toCreate });
  }

  return Response.json({ ok: true, created: toCreate.length });
});
