import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { PPT_FONT_SIZE_PRESETS, DEFAULT_PPT_FONT_SIZE_PRESET, type PptFontSizePreset } from "@/lib/pptTemplate";

export const dynamic = "force-dynamic";

const SETTING_KEY = "ppt_font_size_preset";
const PRESETS = Object.keys(PPT_FONT_SIZE_PRESETS) as PptFontSizePreset[];

export const GET = withErrorHandling(async function GET() {
  await requireSession();
  const row = await db.appSetting.findUnique({ where: { key: SETTING_KEY } });
  const preset = (row?.value as PptFontSizePreset) ?? DEFAULT_PPT_FONT_SIZE_PRESET;
  return Response.json({ preset });
});

export const POST = withErrorHandling(async function POST(req: NextRequest) {
  await requireSession();
  const { preset } = await req.json();
  if (!PRESETS.includes(preset)) return apiError("Invalid preset");

  await db.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: preset },
    create: { key: SETTING_KEY, value: preset },
  });

  return Response.json({ ok: true });
});
