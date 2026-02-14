import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "mako.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Initialize tables (use individual statements for better locking behavior)
const initStatements = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    directory_path TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    position REAL NOT NULL DEFAULT 0,
    branch_name TEXT,
    worktree_path TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    execution_error TEXT,
    execution_started_at INTEGER,
    execution_finished_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS execution_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    run_number INTEGER NOT NULL,
    stream TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )`,
];

for (const sql of initStatements) {
  sqlite.exec(sql);
}

// Migrations for existing databases
const migrations = [
  `ALTER TABLE tasks ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE tasks ADD COLUMN execution_mode TEXT`,
];

for (const sql of migrations) {
  try {
    sqlite.exec(sql);
  } catch {
    // Column already exists, ignore
  }
}
