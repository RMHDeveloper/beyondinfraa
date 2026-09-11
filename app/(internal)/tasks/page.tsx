import { db } from "@/lib/db";
import TasksClient from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [followUps, projects] = await Promise.all([
    db.followUp.findMany({
      orderBy: [{ isDone: "asc" }, { dueAt: "asc" }],
      include: { project: { include: { category: true } } },
      take: 200,
    }),
    db.project.findMany({
      select: { id: true, title: true, category: { select: { name: true } } },
      orderBy: { title: "asc" },
    }),
  ]);
  return <TasksClient followUps={followUps} projects={projects} />;
}
