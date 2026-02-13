"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/types";
import Link from "next/link";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/projects/new"
          className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-4">No projects yet</p>
          <Link
            href="/projects/new"
            className="text-accent hover:underline"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-5 rounded-lg border border-border bg-card-bg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/board/${project.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{project.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {project.directoryPath}
                  </p>
                </div>
                <div className="text-sm text-gray-400">
                  Branch: {project.defaultBranch}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
