"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/types";

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setLoading(false);
        // If there's only one project, go directly to its board
        if (data.length === 1) {
          router.push(`/board/${data[0].id}`);
        } else if (data.length === 0) {
          router.push("/projects/new");
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return null; // Will redirect to /projects/new
  }

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
