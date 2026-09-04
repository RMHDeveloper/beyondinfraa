import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET — return all OPEN Buy/Tenant demand projects in the same category as this listing, with existing match status
export const GET = withErrorHandling(async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id }, select: { categoryId: true } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const [demandProjects, existingMatches] = await Promise.all([
    db.project.findMany({
      where: {
        categoryId: project.categoryId,
        state: "OPEN",
        subcategory: { name: { in: ["Buy", "Tenant"] } },
      },
      select: {
        id: true, projectNumber: true, title: true,
        subcategory: { select: { name: true } },
        clientContact: { select: { name: true } },
        status: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.match.findMany({
      where: { projectId: id },
      select: { id: true, demandProjectId: true, confirmedAt: true, matchPct: true },
    }),
  ]);

  const matchMap = new Map(existingMatches.map(m => [m.demandProjectId, m]));

  return Response.json(
    demandProjects.map(p => ({
      ...p,
      existingMatch: matchMap.get(p.id) ?? null,
    }))
  );
});
