import { db } from "@/lib/db";
import { getObject } from "@/lib/storage";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { isBlankResponseValue } from "@/lib/utils";
import type PptxGenJS from "pptxgenjs";

const TEMPLATE_DIR = path.join(process.cwd(), "public", "ppt-template");
export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

const DEFAULT_TEMPLATE_FILES = { cover: "cover.png", thankyou: "thankyou.png", middle: "middle-bg.png" } as const;
export type TemplateSlot = keyof typeof DEFAULT_TEMPLATE_FILES;

// A light overall wash for cohesion, plus a stronger fade behind the bottom
// logo/line and the top-right URL, so those stay legible over any photo
// without washing out the photo itself (which is what a flat, heavy veil did).
export const OVERLAY_SVG = `
  <svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="white" stop-opacity="0"/>
        <stop offset="100%" stop-color="white" stop-opacity="0.75"/>
      </linearGradient>
      <linearGradient id="topRightFade" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0%" stop-color="white" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="100%" height="100%" fill="white" opacity="0.12"/>
    <rect x="0" y="${CANVAS_H * 0.78}" width="100%" height="${CANVAS_H * 0.22}" fill="url(#bottomFade)"/>
    <rect x="${CANVAS_W * 0.55}" y="0" width="${CANVAS_W * 0.45}" height="${CANVAS_H * 0.18}" fill="url(#topRightFade)"/>
  </svg>
`;

export async function templateSlotDataUri(slot: TemplateSlot): Promise<string> {
  const row = await db.appSetting.findUnique({ where: { key: `ppt_${slot}_image` } });
  if (row) {
    try {
      const buf = await getObject(row.value);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      // fall through to the bundled default if the configured file is missing
    }
  }
  const buf = await readFile(path.join(TEMPLATE_DIR, DEFAULT_TEMPLATE_FILES[slot]));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// Composites a property photo as a framed inset on top of a supplied slide
// background (e.g. the "middle" template), instead of using the photo itself
// as the full-bleed backdrop.
export async function photoOnBackground(photoBuffer: Buffer, backgroundDataUri: string): Promise<string> {
  const rotated = await sharp(photoBuffer).rotate().toBuffer();

  const insetX = Math.round(CANVAS_W * 0.08);
  const insetY = Math.round(CANVAS_H * 0.16);
  const insetW = Math.round(CANVAS_W * 0.84);
  const insetH = Math.round(CANVAS_H * 0.62);

  const framedPhoto = await sharp(rotated)
    .resize(insetW, insetH, { fit: "cover" })
    .toBuffer();

  const base64 = backgroundDataUri.split(",")[1];
  const backgroundBuffer = Buffer.from(base64, "base64");

  const composited = await sharp(backgroundBuffer)
    .resize(CANVAS_W, CANVAS_H, { fit: "cover" })
    .composite([{ input: framedPhoto, left: insetX, top: insetY }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return `data:image/jpeg;base64,${composited.toString("base64")}`;
}

const FIELD_SLIDE_DARK = "111111";
const FIELD_SLIDE_GRAY = "6B7280";

export type PptExportConfig = {
  groupOrder: string[];
  groups: Record<string, { included: boolean; questionOrder: string[]; excludedQuestionIds: string[] }>;
  excludedCustomFieldIds?: string[];
};

// Custom-field rows are placed inside `groupOrder` using an id-prefixed sentinel
// (CUSTOM_FIELD_PREFIX + the ProjectCustomField id) so each field can be individually
// positioned/reordered among the template group slides, not just as one fixed block.
export const CUSTOM_FIELD_PREFIX = "__custom_field__";

type FieldSlideQuestion = { id: string; label: string; fieldType: string; isInternal: boolean; isRequired: boolean; showInPptExport: boolean };
type FieldSlideGroup = { id: string; name: string; questions: FieldSlideQuestion[] };
type FieldSlideTemplateGroup = { group: FieldSlideGroup };
type FieldSlideCustomField = { id: string; label: string; value: string | null; type: "TEXT" | "IMAGE"; file: { id: string; storagePath: string } | null };

// Adds one slide per included question group, plus one slide per included custom field at
// its user-chosen position, in the user-chosen order/selection — the shared field-slide
// layout used by both the single-project and bulk PPT export routes.
export async function addFieldSlides(
  pptx: PptxGenJS,
  templateGroups: FieldSlideTemplateGroup[],
  responseMap: Record<string, string>,
  pptExportConfig: PptExportConfig | undefined,
  middleDataUri: string,
  headerRightLabel: string,
  customFields: FieldSlideCustomField[] = [],
) {
  const groupsById = new Map(templateGroups.map((tg) => [tg.group.id, tg]));
  const customFieldsById = new Map(customFields.map((f) => [f.id, f]));
  const excludedCustomFieldIds = new Set(pptExportConfig?.excludedCustomFieldIds ?? []);
  const groupOrder = pptExportConfig?.groupOrder?.filter((gid) =>
    gid.startsWith(CUSTOM_FIELD_PREFIX) ? customFieldsById.has(gid.slice(CUSTOM_FIELD_PREFIX.length)) : groupsById.has(gid)
  ) ?? [...templateGroups.map((tg) => tg.group.id), ...customFields.map((f) => `${CUSTOM_FIELD_PREFIX}${f.id}`)];

  for (const groupId of groupOrder) {
    if (groupId.startsWith(CUSTOM_FIELD_PREFIX)) {
      const fieldId = groupId.slice(CUSTOM_FIELD_PREFIX.length);
      if (excludedCustomFieldIds.has(fieldId)) continue;
      const field = customFieldsById.get(fieldId)!;
      await addCustomFieldSlide(pptx, field, middleDataUri);
      continue;
    }
    const tg = groupsById.get(groupId)!;
    const groupConfig = pptExportConfig?.groups?.[groupId];
    if (groupConfig && !groupConfig.included) continue;

    const visibleQuestions = tg.group.questions.filter((q) => !q.isInternal);
    let questions;
    if (groupConfig) {
      const excluded = new Set(groupConfig.excludedQuestionIds);
      const byId = new Map(visibleQuestions.map((q) => [q.id, q]));
      const order = groupConfig.questionOrder.filter((qid) => byId.has(qid) && !excluded.has(qid));
      questions = order.map((qid) => byId.get(qid)!);
    } else {
      questions = visibleQuestions.filter((q) => q.showInPptExport);
    }
    const rows = questions
      .map((q) => {
        const val = responseMap[q.id] ?? "";
        const isBlank = isBlankResponseValue(val, q.fieldType);
        return { q, val, isBlank };
      })
      .filter((r) => !r.isBlank || r.q.isRequired);
    if (rows.length === 0) continue;

    const FIELDS_PER_SLIDE = 8;
    const pages: (typeof rows)[] = [];
    for (let i = 0; i < rows.length; i += FIELDS_PER_SLIDE) pages.push(rows.slice(i, i + FIELDS_PER_SLIDE));

    pages.forEach((pageRows, pageIndex) => {
      const slide = pptx.addSlide();
      slide.background = { data: middleDataUri };

      const header = pages.length > 1 ? `${tg.group.name.toUpperCase()} (${pageIndex + 1})` : tg.group.name.toUpperCase();
      slide.addText(header, {
        x: 0.4, y: 0.32, w: 9, h: 0.5, fontSize: 15, bold: true, color: FIELD_SLIDE_DARK, charSpacing: 1,
      });
      slide.addText(headerRightLabel, {
        x: 0, y: 0.32, w: 12.53, h: 0.5, fontSize: 10, color: FIELD_SLIDE_GRAY, align: "right",
      });

      const colW = 5.8;
      const col2X = 6.8;
      let rowY = 1.15;
      let col = 0;

      for (const { q, val, isBlank } of pageRows) {
        const x = col === 0 ? 0.4 : col2X;
        slide.addText(q.label, { x, y: rowY, w: colW, h: 0.4, fontSize: 15, bold: true, color: FIELD_SLIDE_GRAY, wrap: true });
        slide.addText(!isBlank ? val : "—", { x, y: rowY + 0.42, w: colW, h: 0.55, fontSize: 20, color: FIELD_SLIDE_DARK, wrap: true });
        slide.addShape(pptx.ShapeType.line, { x, y: rowY + 1.02, w: colW, h: 0, line: { color: "E5E7EB", width: 0.5 } });

        col = 1 - col;
        if (col === 0) rowY += 1.21;
      }
    });
  }
}

// One custom field, one slide — text fields get a label+value block, image fields get the
// same framed-photo layout used elsewhere. Each field is independently positioned via
// CUSTOM_FIELD_PREFIX in groupOrder, so fields can no longer share a combined slide.
async function addCustomFieldSlide(pptx: PptxGenJS, field: FieldSlideCustomField, middleDataUri: string) {
  if (field.type === "TEXT") {
    if (!field.value?.trim()) return;
    const slide = pptx.addSlide();
    slide.background = { data: middleDataUri };
    slide.addText(field.label.toUpperCase(), { x: 0.4, y: 0.32, w: 9, h: 0.5, fontSize: 15, bold: true, color: FIELD_SLIDE_DARK, charSpacing: 1 });
    slide.addText(field.value ?? "", { x: 0.4, y: 1.15, w: 11.7, h: 3.5, fontSize: 14, color: FIELD_SLIDE_DARK, wrap: true });
    return;
  }
  if (!field.file) return;
  const buf = await getObject(field.file.storagePath);
  const bgDataUri = await photoOnBackground(buf, middleDataUri);
  const slide = pptx.addSlide();
  slide.background = { data: bgDataUri };
  slide.addText(field.label, { x: 0.4, y: 0.32, w: 9, h: 0.5, fontSize: 15, bold: true, color: FIELD_SLIDE_DARK, charSpacing: 1 });
}

export async function propertySlideBackground(photoBuffer: Buffer): Promise<string> {
  const rotated = await sharp(photoBuffer).rotate().toBuffer();

  // Full-bleed blurred backdrop (cropped, but nobody reads a blur) so the
  // whole slide is covered with no visible letterbox bars...
  const blurredBackdrop = await sharp(rotated)
    .resize(CANVAS_W, CANVAS_H, { fit: "cover" })
    .modulate({ brightness: 0.82 })
    .blur(32)
    .toBuffer();

  // ...with the complete, un-cropped photo layered on top at its full extent.
  const fullPhoto = await sharp(rotated)
    .resize(CANVAS_W, CANVAS_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const composited = await sharp(blurredBackdrop)
    .composite([
      { input: fullPhoto },
      { input: Buffer.from(OVERLAY_SVG), blend: "over" },
    ])
    .jpeg({ quality: 87 })
    .toBuffer();

  return `data:image/jpeg;base64,${composited.toString("base64")}`;
}
