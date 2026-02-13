"use client";

import { useRouter } from "next/navigation";
import { Project } from "@/types";

export function ProjectSelector({ projects }: { projects: Project[] }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6">Select Project</h1>
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/board/${project.id}`)}
              className="w-full text-left p-4 rounded-lg border border-border hover:border-accent hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium">{project.name}</div>
              <div className="text-sm text-gray-500 mt-1 truncate">
                {project.directoryPath}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => router.push("/projects/new")}
          className="mt-4 w-full p-3 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          + New Project
        </button>
      </div>
    </div>
  );
}
