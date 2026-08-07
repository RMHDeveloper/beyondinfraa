import { db } from "@/lib/db";
import TasksClient from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const followUps = await db.followUp.findMany({
    orderBy: [{ isDone: "asc" }, { dueAt: "asc" }],
    include: { project: { include: { category: true } } },
    take: 200,
  });
  return <TasksClient followUps={followUps} />;
}
