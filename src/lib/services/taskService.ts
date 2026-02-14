import { db } from "@/db";
import { tasks, projects, executionLogs } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { removeWorktree } from "@/lib/git/worktree";
import { switchBack } from "@/lib/git/branch";

export async function getTasksByProject(projectId: string) {
  return db.select().from(tasks).where(eq(tasks.projectId, projectId)).all();
}

export async function getTask(taskId: string) {
  return db.select().from(tasks).where(eq(tasks.id, taskId)).get();
}

export async function createTask(
  projectId: string,
  title: string,
  status?: string
) {
  const taskStatus = status || "backlog";

  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, taskStatus)))
    .all();

  const maxPosition = existing.reduce((max, t) => Math.max(max, t.position), 0);

  const now = Date.now();
  const task = {
    id: nanoid(),
    projectId,
    title,
    content: null,
    status: taskStatus,
    position: maxPosition + 1,
    branchName: null,
    worktreePath: null,
    executionMode: null,
    retryCount: 0,
    executionError: null,
    executionStartedAt: null,
    executionFinishedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(tasks).values(task);
  return task;
}

async function cleanupIfDone(
  status: string | undefined,
  task: {
    projectId: string;
    worktreePath: string | null;
    executionMode: string | null;
  },
  taskId: string
) {
  if (status !== "done") return;

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, task.projectId))
    .get();

  if (!project) return;

  try {
    if (task.executionMode === "branch") {
      switchBack(project.directoryPath, project.defaultBranch);
      console.log(`[TaskService] Switched back to ${project.defaultBranch} for task ${taskId}`);
    } else if (task.worktreePath) {
      removeWorktree(project.directoryPath, task.worktreePath);
      console.log(`[TaskService] Cleaned up worktree for task ${taskId}`);
    }
  } catch (err) {
    console.error(`[TaskService] Failed to clean up:`, err);
  }
}

export async function updateTask(
  taskId: string,
  updates: Record<string, unknown>
) {
  // Remove id from updates if present
  const cleanUpdates = { ...updates };
  delete cleanUpdates.id;

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();

  await db
    .update(tasks)
    .set({ ...cleanUpdates, updatedAt: Date.now() })
    .where(eq(tasks.id, taskId));

  if (task) {
    await cleanupIfDone(
      cleanUpdates.status as string | undefined,
      task,
      taskId
    );
  }

  return db.select().from(tasks).where(eq(tasks.id, taskId)).get();
}

export async function deleteTask(taskId: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function reorderTask(
  taskId: string,
  status: string,
  position: number
) {
  return updateTask(taskId, { status, position });
}

export async function getExecutionLogs(taskId: string) {
  return db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.taskId, taskId))
    .orderBy(asc(executionLogs.timestamp))
    .all();
}
