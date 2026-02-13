"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Project } from "@/types";

interface SidebarProps {
  projectId?: string;
  projectName?: string;
}

export default function Sidebar({ projectId }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  return (
    <aside className="w-56 bg-sidebar-bg text-sidebar-text flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-700">
        <Link href="/" className="text-lg font-bold tracking-tight">
          MAKO
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-xs uppercase tracking-wider text-gray-400 px-2 mb-2">
          Projects
        </div>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/board/${p.id}`}
            className={`block px-3 py-2 rounded-md text-sm transition-colors ${
              p.id === projectId
                ? "bg-accent text-white"
                : "hover:bg-gray-700"
            }`}
          >
            {p.name}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <Link
          href="/projects/new"
          className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
        >
          + New Project
        </Link>
        <Link
          href="/projects"
          className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
        >
          All Projects
        </Link>
      </div>
    </aside>
  );
}
