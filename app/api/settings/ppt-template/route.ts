import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";
import { uploadObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

const SLOTS = ["cover", "second", "thankyou", "middle"] as const;
type Slot = (typeof SLOTS)[number];

function settingKey(slot: Slot) {
  return `ppt_${slot}_image`;
}

export const GET = withErrorHandling(async function GET() {
  await requireSession();
  const rows = await db.appSetting.findMany({ where: { key: { in: SLOTS.map(settingKey) } } });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Response.json(Object.fromEntries(SLOTS.map((s) => [s, !!byKey[settingKey(s)]])));
});

export const POST = withErrorHandling(async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return apiError("Forbidden", 403);

  const formData = await req.formData();
  const slot = formData.get("slot") as string | null;
  const file = formData.get("file") as File | null;
  if (!slot || !SLOTS.includes(slot as Slot)) return apiError("Invalid slot");
  if (!file) return apiError("No file provided");

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".png";
  const storagePath = `settings/ppt-${slot}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject(storagePath, buffer, file.type);

  await db.appSetting.upsert({
    where: { key: settingKey(slot as Slot) },
    update: { value: storagePath },
    create: { key: settingKey(slot as Slot), value: storagePath },
  });

  return Response.json({ ok: true });
});
