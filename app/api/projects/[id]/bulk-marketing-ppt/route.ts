import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { templateSlotDataUri, optionalTemplateSlotDataUri, addFieldSlides, type PptExportConfig } from "@/lib/pptTemplate";
import PptxGenJS from "pptxgenjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST — bulk PPT export from a Buy/Tenant (demand) project's Find Properties tab.
// Confirms a Match for each selected listing, then builds one PPTX: cover, each
// selected property's own field-group slides (using its saved ppt-export config),
// thank-you. Also logs an EXPORT audit entry so it shows up in export history.
export const POST = withErrorHandling(async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id: demandProjectId } = await params;
  const { projectIds } = await req.json() as { projectIds: string[] };

  if (!Array.isArray(projectIds) || projectIds.length === 0) return apiError("projectIds required");

  const demandProject = await db.project.findUnique({ where: { id: demandProjectId }, select: { id: true, title: true } });
  if (!demandProject) return apiError("Not found", 404);

  const properties = await db.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true, title: true, projectNumber: true, pptExportConfig: true,
      template: {
        select: {
          groups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, sortOrder: true,
              group: {
                select: {
                  id: true, name: true,
                  questions: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, label: true, fieldType: true, isInternal: true, isRequired: true, showInPptExport: true },
                  },
                },
              },
            },
          },
        },
      },
      responses: { select: { questionId: true, value: true } },
    },
  });
  const byId = new Map(properties.map((p) => [p.id, p]));
  const orderedProperties = projectIds.map((pid) => byId.get(pid)).filter((p): p is NonNullable<typeof p> => !!p);
  if (orderedProperties.length === 0) return apiError("No matching properties found");

  await Promise.all(
    orderedProperties.map((p) =>
      db.match.upsert({
        where: { projectId_demandProjectId: { projectId: p.id, demandProjectId } },
        update: { confirmedAt: new Date(), isManual: true },
        create: { projectId: p.id, demandProjectId, matchPct: 0, isManual: true, confirmedAt: new Date() },
      })
    )
  );

  const [coverDataUri, thankYouDataUri, middleDataUri, secondSlideDataUri] = await Promise.all([
    templateSlotDataUri("cover"),
    templateSlotDataUri("thankyou"),
    templateSlotDataUri("middle"),
    optionalTemplateSlotDataUri("second"),
  ]);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "BeyondInfra";
  pptx.company = "BeyondInfra";
  pptx.title = `Properties for ${demandProject.title}`;

  {
    const slide = pptx.addSlide();
    slide.background = { data: coverDataUri };
  }

  for (const p of orderedProperties) {
    const responseMap = Object.fromEntries(p.responses.map((r) => [r.questionId, r.value ?? ""]));
    await addFieldSlides(pptx, p.template.groups, responseMap, (p.pptExportConfig as PptExportConfig | null) ?? undefined, middleDataUri, p.title);
  }

  if (secondSlideDataUri) {
    const slide = pptx.addSlide();
    slide.background = { data: secondSlideDataUri };
  }

  {
    const slide = pptx.addSlide();
    slide.background = { data: thankYouDataUri };
  }

  await db.auditLog.create({
    data: {
      projectId: demandProjectId,
      userId: session.id,
      action: "EXPORT",
      entityType: "bulk_ppt",
      meta: {
        properties: orderedProperties.map((p) => ({ id: p.id, title: p.title, projectNumber: p.projectNumber })),
      },
    },
  });

  const buf = await pptx.write({ outputType: "arraybuffer" });
  const filename = `${demandProject.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}-properties.pptx`;

  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
