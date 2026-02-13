import { NextRequest, NextResponse } from "next/server";
import { reorderTask } from "@/lib/services/taskService";

/** PUT /api/board/reorder — 칸반 보드에서 태스크 드래그 시 상태·위치 변경 (done 이동 시 worktree 자동 정리) */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { taskId, status, position } = body;

  if (!taskId || !status || position === undefined) {
    return NextResponse.json(
      { error: "taskId, status, and position are required" },
      { status: 400 }
    );
  }

  const updated = await reorderTask(taskId, status, position);
  return NextResponse.json(updated);
}
