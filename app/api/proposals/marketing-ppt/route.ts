import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { getObject } from "@/lib/storage";
import { templateSlotDataUri, propertySlideBackground } from "@/lib/pptTemplate";
import PptxGenJS from "pptxgenjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  await requireSession();
  const { items } = await req.json() as { items: { projectId: string; imageId: string }[] };

  if (!Array.isArray(items) || items.length === 0) return apiError("items required");

  const files = await db.projectFile.findMany({
    where: { id: { in: items.map((i) => i.imageId) }, kind: "GALLERY_IMAGE" },
  });
  const byId = new Map(files.map((f) => [f.id, f]));
  // Only keep pairs where the file genuinely belongs to the stated project — trust nothing from the client.
  const orderedFiles = items
    .map((i) => byId.get(i.imageId))
    .filter((f): f is NonNullable<typeof f> => !!f && items.some((i) => i.imageId === f.id && i.projectId === f.projectId));
  if (orderedFiles.length === 0) return apiError("No matching images found");

  const [coverDataUri, thankYouDataUri, logoDataUri, propertySlides] = await Promise.all([
    templateSlotDataUri("cover"),
    templateSlotDataUri("thankyou"),
    templateSlotDataUri("logo"),
    Promise.all(orderedFiles.map(async (f) => propertySlideBackground(await getObject(f.storagePath)))),
  ]);

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
    slide.addImage({ data: logoDataUri, x: 0.35, y: 6.36, w: 1.16, h: 1.0 });
    slide.addShape(pptx.ShapeType.rect, { x: 1.22, y: 6.98, w: 11.32, h: 0.03, fill: { color: "4B5563" } });
    slide.addText("www.beyondinfra.com", {
      x: 9.0, y: 0.42, w: 3.9, h: 0.35, fontSize: 11, color: "374151", align: "right", charSpacing: 2,
    });
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
}
