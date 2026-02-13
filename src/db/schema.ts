import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  directoryPath: text("directory_path").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  content: text("content"),
  status: text("status").notNull().default("backlog"),
  position: real("position").notNull().default(0),
  branchName: text("branch_name"),
  worktreePath: text("worktree_path"),
  retryCount: integer("retry_count").notNull().default(0),
  executionError: text("execution_error"),
  executionStartedAt: integer("execution_started_at"),
  executionFinishedAt: integer("execution_finished_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const executionLogs = sqliteTable("execution_logs", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  runNumber: integer("run_number").notNull(),
  stream: text("stream").notNull(), // stdout | stderr | system
  content: text("content").notNull(),
  timestamp: integer("timestamp").notNull(),
});
