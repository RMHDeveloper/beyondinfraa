import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { getObject } from "@/lib/storage";
import { templateSlotDataUri, photoOnBackground } from "@/lib/pptTemplate";
import PptxGenJS from "pptxgenjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = withErrorHandling(async function POST(req: NextRequest) {
  await requireSession();
  const { items } = await req.json() as { items: { projectId: string; imageId: string }[] };

  if (!Array.isArray(items) || items.length === 0) return apiError("items required");

  const files = await db.projectFile.findMany({
    where: { id: { in: items.map((i) => i.imageId) }, kind: { in: ["GALLERY_IMAGE", "CUSTOM_FIELD_IMAGE"] } },
  });
  const byId = new Map(files.map((f) => [f.id, f]));
  // Only keep pairs where the file genuinely belongs to the stated project — trust nothing from the client.
  const orderedFiles = items
    .map((i) => byId.get(i.imageId))
    .filter((f): f is NonNullable<typeof f> => !!f && items.some((i) => i.imageId === f.id && i.projectId === f.projectId));
  if (orderedFiles.length === 0) return apiError("No matching images found");

  const [coverDataUri, thankYouDataUri, middleDataUri] = await Promise.all([
    templateSlotDataUri("cover"),
    templateSlotDataUri("thankyou"),
    templateSlotDataUri("middle"),
  ]);

  const propertySlides = await Promise.all(
    orderedFiles.map(async (f) => photoOnBackground(await getObject(f.storagePath), middleDataUri))
  );

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "BeyondInfra";
  pptx.company = "BeyondInfra";
  pptx.title = "Property Presentation";

  {
    const slide = pptx.addSlide();
    slide.background = { data: coverDataUri };
  }

  for (const bgDataUri of propertySlides) {
    const slide = pptx.addSlide();
    slide.background = { data: bgDataUri };
  }

  {
    const slide = pptx.addSlide();
    slide.background = { data: thankYouDataUri };
  }

  const buf = await pptx.write({ outputType: "arraybuffer" });

  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="property-presentation.pptx"`,
    },
  });
});
