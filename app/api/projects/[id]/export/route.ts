import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import PptxGenJS from "pptxgenjs";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    select: {
      id: true, projectNumber: true, title: true, state: true,
      clientName: true, clientPhone: true, potentialScore: true,
      category:    { select: { name: true } },
      subcategory: { select: { name: true } },
      status:      { select: { name: true, color: true } },
      template: {
        select: {
          name: true,
          groups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, sortOrder: true,
              group: {
                select: {
                  id: true, name: true,
                  questions: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, label: true, isInternal: true, isRequired: true },
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

  if (!project) return apiError("Not found", 404);

  const responseMap = Object.fromEntries(
    project.responses.map((r) => [r.questionId, r.value ?? ""])
  );

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "BeyondInfra";
  pptx.company = "BeyondInfra";
  pptx.title = project.title;

  const DARK = "111111";
  const GRAY = "6B7280";
  const LIGHT = "F9FAFB";
  const ACCENT = "1D4ED8";

  // ── Slide 1: Cover ──────────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: DARK };

    slide.addText(project.projectNumber, {
      x: 0.5, y: 0.4, w: 12, h: 0.4,
      fontSize: 11, color: "888888", fontFace: "Courier New",
    });
    slide.addText(project.title, {
      x: 0.5, y: 1.0, w: 12, h: 1.2,
      fontSize: 36, bold: true, color: "FFFFFF", wrap: true,
    });
    slide.addText(`${project.category.name}  ·  ${project.subcategory.name}`, {
      x: 0.5, y: 2.3, w: 12, h: 0.4,
      fontSize: 14, color: "9CA3AF",
    });
    if (project.status) {
      slide.addText(project.status.name.toUpperCase(), {
        x: 0.5, y: 3.0, w: 2.5, h: 0.35,
        fontSize: 11, bold: true, color: "FFFFFF",
        fill: { color: project.status.color.replace("#", "") },
        align: "center", valign: "middle",
        shape: pptx.ShapeType.roundRect, rectRadius: 0.05,
      });
    }
    if (project.clientName) {
      slide.addText(`Client: ${project.clientName}`, {
        x: 0.5, y: 3.7, w: 6, h: 0.35, fontSize: 13, color: "D1D5DB",
      });
    }
    if (project.potentialScore !== null) {
      const score = project.potentialScore;
      slide.addText(`Potential Score: ${score >= 0 ? "+" : ""}${score}`, {
        x: 8, y: 3.7, w: 4, h: 0.35, fontSize: 13,
        color: score >= 30 ? "4ADE80" : score >= 0 ? "FCD34D" : "F87171",
        align: "right",
      });
    }
    slide.addText(`BeyondInfra  ·  ${new Date().toLocaleDateString("en-IN")}`, {
      x: 0.5, y: 4.8, w: 12, h: 0.3, fontSize: 10, color: "4B5563",
    });
  }

  // ── Slides: One per question group ─────────────────────────────────────────
  for (const tg of project.template.groups) {
    const questions = tg.group.questions.filter((q) => !q.isInternal);
    if (questions.length === 0) continue;

    const slide = pptx.addSlide();
    slide.background = { fill: "FFFFFF" };

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.7, fill: { color: DARK },
    });
    slide.addText(tg.group.name.toUpperCase(), {
      x: 0.4, y: 0, w: 12, h: 0.7,
      fontSize: 11, bold: true, color: "FFFFFF", valign: "middle",
    });
    slide.addText(project.title, {
      x: 0, y: 0, w: 12.8, h: 0.7,
      fontSize: 10, color: "9CA3AF", align: "right", valign: "middle",
    });

    // Two-column layout
    const colW = 5.8;
    const col2X = 6.8;
    let rowY = 1.0;
    let col = 0;

    for (const q of questions) {
      const val = responseMap[q.id] ?? "";
      if (!val && !q.isRequired) continue;

      const x = col === 0 ? 0.4 : col2X;

      slide.addText(q.label, {
        x, y: rowY, w: colW, h: 0.25,
        fontSize: 9, bold: true, color: GRAY,
      });
      slide.addText(val || "—", {
        x, y: rowY + 0.26, w: colW, h: 0.38,
        fontSize: 12, color: DARK, wrap: true,
      });
      slide.addShape(pptx.ShapeType.line, {
        x, y: rowY + 0.66, w: colW, h: 0,
        line: { color: "E5E7EB", width: 0.5 },
      });

      col = 1 - col;
      if (col === 0) rowY += 0.85;
      if (rowY > 4.8) break; // guard against overflow
    }
  }

  // ── Slide: Summary ──────────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: LIGHT };

    slide.addText("Project Summary", {
      x: 0.5, y: 0.3, w: 12, h: 0.6,
      fontSize: 24, bold: true, color: DARK,
    });

    const rows: [string, string][] = [
      ["Project Number", project.projectNumber],
      ["Title", project.title],
      ["Category", project.category.name],
      ["Type", project.subcategory.name],
      ["Status", project.status?.name ?? "—"],
      ["State", project.state],
      ["Client", project.clientName ?? "—"],
      ["Potential Score", project.potentialScore !== null ? String(project.potentialScore) : "—"],
    ];

    rows.forEach(([label, value], i) => {
      const y = 1.1 + i * 0.42;
      slide.addText(label, { x: 0.5, y, w: 3, h: 0.35, fontSize: 12, color: GRAY, bold: true });
      slide.addText(value, { x: 3.8, y, w: 8, h: 0.35, fontSize: 12, color: DARK });
    });
  }

  const buf = await pptx.write({ outputType: "arraybuffer" });
  const filename = `${project.projectNumber}-${project.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40)}.pptx`;

  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
