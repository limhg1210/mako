import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function getAllProjects() {
  return db.select().from(projects).all();
}

export async function createProject(
  name: string,
  directoryPath: string,
  defaultBranch?: string
) {
  const now = Date.now();
  const project = {
    id: nanoid(),
    name,
    directoryPath,
    defaultBranch: defaultBranch || "main",
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(projects).values(project);
  return project;
}

export async function updateProject(
  id: string,
  updates: Record<string, unknown>
) {
  await db
    .update(projects)
    .set({ ...updates, updatedAt: Date.now() })
    .where(eq(projects.id, id));

  return db.select().from(projects).where(eq(projects.id, id)).get();
}
