import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { getObject } from "@/lib/storage";
import PptxGenJS from "pptxgenjs";

export const dynamic = "force-dynamic";

const NAVY = "1A2B3C";
const ACCENT = "2563EB";
const WHITE = "FFFFFF";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const { imageIds } = await req.json() as { imageIds: string[] };

  if (!Array.isArray(imageIds) || imageIds.length === 0) return apiError("imageIds required");

  const project = await db.project.findUnique({
    where: { id },
    select: {
      title: true, clientName: true,
      category: { select: { name: true } },
      subcategory: { select: { name: true } },
    },
  });
  if (!project) return apiError("Not found", 404);

  const files = await db.projectFile.findMany({ where: { id: { in: imageIds }, projectId: id } });
  const byId = new Map(files.map((f) => [f.id, f]));
  const orderedFiles = imageIds.map((imgId) => byId.get(imgId)).filter((f): f is NonNullable<typeof f> => !!f);
  if (orderedFiles.length === 0) return apiError("No matching images found");

  const images = await Promise.all(
    orderedFiles.map(async (f) => ({
      dataUri: `data:${f.mimeType};base64,${(await getObject(f.storagePath)).toString("base64")}`,
    }))
  );

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "BeyondInfra";
  pptx.company = "BeyondInfra";
  pptx.title = project.title;

  // ── Slide 1: Cover (fixed branding) ─────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: WHITE };
    slide.addText("BEYONDINFRA PVT. LTD.", {
      x: 0.6, y: 2.0, w: 9, h: 0.7, fontSize: 32, bold: true, color: NAVY,
    });
    slide.addText("Industrial | Commercial | Residential", {
      x: 0.6, y: 2.65, w: 9, h: 0.4, fontSize: 16, bold: true, color: ACCENT,
    });
    const bullets = ["Real Estate Consultancy", "Turn Key Solutions", "One Stop Solutions", "International Properties"];
    bullets.forEach((b, i) => {
      slide.addText(b, {
        x: 0.7, y: 3.3 + i * 0.42, w: 8, h: 0.35, fontSize: 15, color: "1F2937",
        bullet: { code: "2726" },
      });
    });
    slide.addText("RERA Registration: TN/666/2019", {
      x: 0.6, y: 6.9, w: 6, h: 0.3, fontSize: 10, color: "9CA3AF",
    });
  }

  // ── One slide per selected image ────────────────────────────────────────────
  for (const img of images) {
    const slide = pptx.addSlide();
    slide.background = { fill: WHITE };

    slide.addImage({ data: img.dataUri, x: 0, y: 0, w: 8.0, h: 7.5, sizing: { type: "cover", w: 8.0, h: 7.5 } });

    slide.addShape(pptx.ShapeType.rect, { x: 8.0, y: 0, w: 5.33, h: 7.5, fill: { color: NAVY } });
    slide.addText(project.title, {
      x: 8.4, y: 0.6, w: 4.6, h: 1.0, fontSize: 22, bold: true, color: WHITE, wrap: true,
    });
    slide.addText(`${project.category.name} · ${project.subcategory.name}`, {
      x: 8.4, y: 1.6, w: 4.6, h: 0.4, fontSize: 12, color: "9CA3AF",
    });
    if (project.clientName) {
      slide.addText(`Owner: ${project.clientName}`, {
        x: 8.4, y: 2.15, w: 4.6, h: 0.35, fontSize: 11, color: "D1D5DB",
      });
    }
  }

  // ── Last slide: Thank You (fixed branding) ──────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: ACCENT };
    slide.addText("THANK YOU", {
      x: 0, y: 3.1, w: 13.33, h: 0.8, fontSize: 30, bold: true, color: WHITE, align: "center",
    });
    slide.addText("+91 96770 30372  |  +91 80560 03031", {
      x: 0, y: 3.9, w: 13.33, h: 0.4, fontSize: 13, color: "E0E7FF", align: "center",
    });
    slide.addText("www.beyondinfra.com", {
      x: 0, y: 4.25, w: 13.33, h: 0.4, fontSize: 13, color: "E0E7FF", align: "center",
    });
  }

  const buf = await pptx.write({ outputType: "arraybuffer" });
  const filename = `${project.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}-marketing.pptx`;

  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
