import { db } from "@/db";
import { tasks, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { executeClaude } from "@/lib/claude/executor";
import { buildPrompt } from "@/lib/claude/promptBuilder";
import { createWorktree } from "@/lib/git/worktree";
import { switchBranch, switchBack } from "@/lib/git/branch";
import { moveToReview, failToReady } from "@/lib/services/transitionService";
import { Task, ExecutionMode } from "@/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function runTask(
  taskId: string,
  mode: ExecutionMode
): Promise<void> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task || task.status !== "ready") {
    throw new Error(`Task ${taskId} is not in ready status`);
  }

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, task.projectId))
    .get();
  if (!project) {
    throw new Error(`Project ${task.projectId} not found`);
  }

  const branchName = `mako/${slugify(task.title)}-${task.id.slice(0, 6)}`;

  try {
    // 1. Setup working directory based on mode
    let cwdPath: string;
    if (mode === "branch") {
      cwdPath = switchBranch(
        project.directoryPath,
        branchName,
        project.defaultBranch
      );
    } else {
      cwdPath = createWorktree(
        project.directoryPath,
        branchName,
        project.defaultBranch
      );
    }

    // 2. Update task status to working
    await db
      .update(tasks)
      .set({
        status: "working",
        branchName,
        worktreePath: mode === "worktree" ? cwdPath : null,
        executionMode: mode,
        executionStartedAt: Date.now(),
        executionError: null,
        updatedAt: Date.now(),
      })
      .where(eq(tasks.id, taskId));

    // 3. Get run number from retry count
    const currentTask = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    const runNumber = (currentTask?.retryCount ?? 0) + 1;

    // 4. Execute Claude
    const prompt = buildPrompt(currentTask as Task);
    const result = await executeClaude(prompt, cwdPath, taskId, runNumber);

    if (result.success) {
      // 5. Move to review via transitionService
      await moveToReview(taskId);
    } else {
      // Execution failed - move back to ready for retry
      if (mode === "branch") {
        switchBack(project.directoryPath, project.defaultBranch);
      }
      await failToReady(
        taskId,
        result.error || "Unknown error",
        runNumber
      );
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const retryCount = (task.retryCount ?? 0) + 1;
    if (mode === "branch") {
      try {
        switchBack(project.directoryPath, project.defaultBranch);
      } catch {
        // Best effort cleanup
      }
    }
    await failToReady(taskId, errMsg, retryCount);
  }
}
