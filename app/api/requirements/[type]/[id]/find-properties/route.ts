import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — return all OPEN projects in the same category as this requirement, with existing match status
export async function GET(_: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  await requireSession();
  const { type, id } = await params;

  let categoryId: string | null = null;

  if (type === "buyer") {
    const req = await db.buyerRequirement.findUnique({ where: { id }, select: { categoryId: true } });
    if (!req) return Response.json({ error: "Not found" }, { status: 404 });
    categoryId = req.categoryId;
  } else if (type === "tenant") {
    const req = await db.tenantRequirement.findUnique({ where: { id }, select: { categoryId: true } });
    if (!req) return Response.json({ error: "Not found" }, { status: 404 });
    categoryId = req.categoryId;
  } else {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }

  const [projects, existingMatches] = await Promise.all([
    db.project.findMany({
      where: { categoryId, state: "OPEN" },
      select: { id: true, projectNumber: true, title: true, status: { select: { name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.match.findMany({
      where: {
        ...(type === "buyer" ? { buyerRequirementId: id } : { tenantRequirementId: id }),
      },
      select: { id: true, projectId: true, confirmedAt: true, matchPct: true },
    }),
  ]);

  const matchMap = new Map(existingMatches.map(m => [m.projectId, m]));

  return Response.json(
    projects.map(p => ({
      ...p,
      existingMatch: matchMap.get(p.id) ?? null,
    }))
  );
}
