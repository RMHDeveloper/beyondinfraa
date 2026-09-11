import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { getObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

const SLOTS = ["cover", "second", "thankyou", "middle"] as const;
type Slot = (typeof SLOTS)[number];

// "second" has no bundled default — it's an optional slide, skipped entirely in the
// export when unset. The other three always fall back to a bundled default.
const DEFAULT_FILES: Partial<Record<Slot, string>> = {
  cover: "cover.png",
  thankyou: "thankyou.png",
  middle: "middle-bg.png",
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ slot: string }> }) {
  await requireSession();
  const { slot } = await params;
  if (!SLOTS.includes(slot as Slot)) return apiError("Invalid slot", 400);

  const row = await db.appSetting.findUnique({ where: { key: `ppt_${slot}_image` } });

  if (row) {
    try {
      const buffer = await getObject(row.value);
      return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "image/png" } });
    } catch {
      // fall through to bundled default if the stored file is missing
    }
  }

  const defaultFile = DEFAULT_FILES[slot as Slot];
  if (!defaultFile) return apiError("Not configured", 404);

  const { readFile } = await import("fs/promises");
  const path = await import("path");
  const buffer = await readFile(path.join(process.cwd(), "public", "ppt-template", defaultFile));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "image/png" } });
}
