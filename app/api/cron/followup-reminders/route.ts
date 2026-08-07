import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sendFollowUpReminder } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (vercel.json) or external scheduler
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return new Response("Forbidden", { status: 403 });
  }

  // Find follow-ups due today that are not done
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const due = await db.followUp.findMany({
    where: { isDone: false, dueAt: { gte: todayStart, lt: todayEnd } },
    take: 200,
    select: {
      id: true, assigneeId: true, description: true, dueAt: true,
      project: { select: { title: true } },
    },
  });

  const assigneeIds = [...new Set(due.map(d => d.assigneeId).filter(Boolean))] as string[];
  const users = await db.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  let sent = 0;
  for (const item of due) {
    if (!item.assigneeId) continue;
    const assignee = userMap[item.assigneeId];
    if (!assignee?.email) continue;

    await sendFollowUpReminder(
      assignee.email,
      assignee.name,
      item.project.title,
      item.description,
      item.dueAt
    ).catch((e) => console.error("[cron] reminder failed:", e));
    sent++;
  }

  return Response.json({ ok: true, sent });
}
