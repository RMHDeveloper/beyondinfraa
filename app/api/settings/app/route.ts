import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function GET() {
  const settings = await db.appSetting.findMany({ orderBy: { key: "asc" } });
  return Response.json(Object.fromEntries(settings.map((s) => [s.key, s.value])));
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return apiError("Forbidden", 403);

  const updates: Record<string, string> = await req.json();
  for (const [key, value] of Object.entries(updates)) {
    await db.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  return Response.json({ ok: true });
}
