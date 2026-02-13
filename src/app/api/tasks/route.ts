import { NextRequest, NextResponse } from "next/server";
import { getTasksByProject, createTask } from "@/lib/services/taskService";

/** GET /api/tasks?projectId=xxx — 프로젝트에 속한 태스크 목록 조회 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const allTasks = await getTasksByProject(projectId);
  return NextResponse.json(allTasks);
}

/** POST /api/tasks — 새 태스크 생성 (position 자동 계산) */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, title, status } = body;

  if (!projectId || !title) {
    return NextResponse.json({ error: "projectId and title are required" }, { status: 400 });
  }

  const task = await createTask(projectId, title, status);
  return NextResponse.json(task, { status: 201 });
}
