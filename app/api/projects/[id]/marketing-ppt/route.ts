import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { getObject } from "@/lib/storage";
import { templateSlotDataUri, optionalTemplateSlotDataUri, photoOnBackground, addFieldSlides, type PptExportConfig } from "@/lib/pptTemplate";
import PptxGenJS from "pptxgenjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = withErrorHandling(async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { imageIds, pptExportConfig } = await req.json() as { imageIds: string[]; pptExportConfig?: PptExportConfig };

  if (!Array.isArray(imageIds)) return apiError("imageIds required");

  const project = await db.project.findUnique({
    where: { id },
    select: {
      title: true,
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
      customFields: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, value: true, type: true, file: { select: { id: true, storagePath: true } } },
      },
    },
  });
  if (!project) return apiError("Not found", 404);

  const responseMap = Object.fromEntries(project.responses.map((r) => [r.questionId, r.value ?? ""]));

  const files = await db.projectFile.findMany({ where: { id: { in: imageIds }, projectId: id } });
  const byId = new Map(files.map((f) => [f.id, f]));
  const orderedFiles = imageIds.map((imgId) => byId.get(imgId)).filter((f): f is NonNullable<typeof f> => !!f);

  const [coverDataUri, thankYouDataUri, middleDataUri, secondSlideDataUri] = await Promise.all([
    templateSlotDataUri("cover"),
    templateSlotDataUri("thankyou"),
    templateSlotDataUri("middle"),
    optionalTemplateSlotDataUri("second"),
  ]);

  const propertySlides = await Promise.all(
    orderedFiles.map(async (f) => photoOnBackground(await getObject(f.storagePath), middleDataUri))
  );

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "BeyondInfra";
  pptx.company = "BeyondInfra";
  pptx.title = project.title;

  // ── Slide 1: Cover (fixed branding, pixel-exact from the approved template) ──
  {
    const slide = pptx.addSlide();
    slide.background = { data: coverDataUri };
  }

  // ── Field slides: one per question group, plus Additional Fields at their chosen position ──
  await addFieldSlides(pptx, project.template.groups, responseMap, pptExportConfig, middleDataUri, project.title, project.customFields);

  // ── One slide per selected gallery image, in the approved property template ──
  for (const bgDataUri of propertySlides) {
    const slide = pptx.addSlide();
    slide.background = { data: bgDataUri };
  }

  // ── Optional second-to-last slide, shown only if configured in settings ──
  if (secondSlideDataUri) {
    const slide = pptx.addSlide();
    slide.background = { data: secondSlideDataUri };
  }

  // ── Last slide: Thank You (fixed branding, pixel-exact from the approved template) ──
  {
    const slide = pptx.addSlide();
    slide.background = { data: thankYouDataUri };
  }

  const buf = await pptx.write({ outputType: "arraybuffer" });
  const filename = `${project.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}-marketing.pptx`;

  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
