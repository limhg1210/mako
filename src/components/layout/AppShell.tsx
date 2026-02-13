"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
  projectId?: string;
  projectName?: string;
}

export default function AppShell({ children, projectId, projectName }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projectId={projectId} projectName={projectName} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 border-b border-border bg-white flex items-center justify-between px-4 shrink-0">
          <div className="font-semibold text-sm">
            {projectName || "MAKO"}
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
