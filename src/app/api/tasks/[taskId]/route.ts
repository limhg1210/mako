import { NextRequest, NextResponse } from "next/server";
import { getTask, updateTask, deleteTask } from "@/lib/services/taskService";

/** GET /api/tasks/:taskId — 태스크 상세 조회 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const task = await getTask(taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

/** PUT /api/tasks/:taskId — 태스크 수정 (status=done 시 worktree 자동 정리) */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const body = await request.json();

  const updated = await updateTask(taskId, body);
  return NextResponse.json(updated);
}

/** DELETE /api/tasks/:taskId — 태스크 삭제 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  await deleteTask(taskId);
  return NextResponse.json({ ok: true });
}
