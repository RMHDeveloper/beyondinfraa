import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sendSiteVisitReminder } from "@/lib/mailer";
import { withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (vercel.json) or external scheduler
export const GET = withErrorHandling(async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  // Find site visits scheduled today that haven't been cancelled/completed
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const due = await db.siteVisit.findMany({
    where: {
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      scheduledAt: { gte: todayStart, lt: todayEnd },
    },
    take: 200,
    select: {
      id: true, visitNumber: true, managedById: true, location: true, mapsLink: true, scheduledAt: true,
      project: { select: { title: true } },
      contact: { select: { name: true } },
    },
  });

  const managerIds = [...new Set(due.map(d => d.managedById).filter(Boolean))] as string[];
  const users = await db.user.findMany({
    where: { id: { in: managerIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  let sent = 0;
  for (const visit of due) {
    if (!visit.managedById) continue;
    const manager = userMap[visit.managedById];
    if (!manager?.email) continue;

    const propertyTitle = visit.project?.title ?? visit.contact?.name ?? "Site Visit";
    await sendSiteVisitReminder(
      manager.email,
      manager.name,
      visit.visitNumber,
      propertyTitle,
      visit.location,
      visit.mapsLink,
      visit.scheduledAt
    ).catch((e) => console.error("[cron] site visit reminder failed:", e));
    sent++;
  }

  return Response.json({ ok: true, sent });
});
