"use client";

import { useEffect, useState, use } from "react";
import { Project } from "@/types";
import AppShell from "@/components/layout/AppShell";
import KanbanBoard from "@/components/board/KanbanBoard";

export default function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((projects: Project[]) => {
        const found = projects.find((p) => p.id === projectId);
        if (found) setProject(found);
      })
      .catch(() => {});
  }, [projectId]);

  return (
    <AppShell projectId={projectId} projectName={project?.name}>
      <KanbanBoard projectId={projectId} />
    </AppShell>
  );
}
