import { db } from "@/lib/db";
import { getObject } from "@/lib/storage";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const TEMPLATE_DIR = path.join(process.cwd(), "public", "ppt-template");
export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

const DEFAULT_TEMPLATE_FILES = { cover: "cover.png", logo: "logo-icon.png", thankyou: "thankyou.png" } as const;
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
