import { db } from "@/lib/db";
import { apiError, withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Resolves a project's URL key — either its internal id or its human-readable
// projectNumber (e.g. "BI-RES-0023") — to its real id, so /projects/[id] can be
// linked to and shared using the readable number while every other route keeps
// working off the internal id unchanged.
export const GET = withErrorHandling(async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = await db.project.findFirst({
    where: { OR: [{ id: key }, { projectNumber: key }] },
    select: { id: true },
  });
  if (!project) return apiError("Not found", 404);
  return Response.json({ id: project.id });
});
