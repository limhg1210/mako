import { db } from "@/db";
import { tasks, executionLogs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getExecutionStatus(taskId: string, since: number) {
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) return null;

  const allLogs = await db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.taskId, taskId))
    .orderBy(asc(executionLogs.timestamp))
    .all();

  const newLogs = allLogs.filter((l) => l.timestamp > since);

  return { task, newLogs };
}
