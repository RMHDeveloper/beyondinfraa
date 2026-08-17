import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MEETING_PREFIX = "__meeting__:";

export type CalendarEvent = {
  id: string;
  type: "followup" | "sitevisit" | "meeting";
  date: string;
  title: string;
  done: boolean;
  projectId: string | null;
  projectTitle: string | null;
};

export async function GET(req: Request) {
  await requireSession();
  const { searchParams } = new URL(req.url);
  const start = new Date(searchParams.get("start") ?? "");
  const end = new Date(searchParams.get("end") ?? "");
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: "start and end query params required (ISO dates)" }, { status: 400 });
  }

  const [followUps, siteVisits, meetingNotes] = await Promise.all([
    db.followUp.findMany({
      where: { dueAt: { gte: start, lte: end } },
      orderBy: { dueAt: "asc" },
      select: {
        id: true, dueAt: true, description: true, isDone: true,
        project: { select: { id: true, title: true } },
      },
    }),
    db.siteVisit.findMany({
      where: { scheduledAt: { gte: start, lte: end } },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true, scheduledAt: true, status: true,
        contact: { select: { name: true } },
        project: { select: { id: true, title: true } },
      },
    }),
    db.projectNote.findMany({
      where: { content: { startsWith: MEETING_PREFIX } },
      select: { id: true, content: true, project: { select: { id: true, title: true } } },
    }),
  ]);

  const events: CalendarEvent[] = [];

  for (const f of followUps) {
    events.push({
      id: f.id, type: "followup", date: f.dueAt.toISOString(),
      title: f.description, done: f.isDone,
      projectId: f.project.id, projectTitle: f.project.title,
    });
  }

  for (const v of siteVisits) {
    events.push({
      id: v.id, type: "sitevisit", date: v.scheduledAt.toISOString(),
      title: v.contact ? `Site visit — ${v.contact.name}` : "Site visit", done: v.status === "COMPLETED",
      projectId: v.project?.id ?? null, projectTitle: v.project?.title ?? null,
    });
  }

  for (const n of meetingNotes) {
    try {
      const data = JSON.parse(n.content.slice(MEETING_PREFIX.length));
      const scheduledAt = new Date(data.scheduledAt);
      if (scheduledAt >= start && scheduledAt <= end) {
        events.push({
          id: n.id, type: "meeting", date: scheduledAt.toISOString(),
          title: data.title, done: scheduledAt.getTime() < Date.now(),
          projectId: n.project.id, projectTitle: n.project.title,
        });
      }
    } catch { /* skip malformed meeting note */ }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return Response.json(events);
}
