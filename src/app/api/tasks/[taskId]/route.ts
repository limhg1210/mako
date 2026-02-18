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

/** PUT /api/tasks/:taskId — 태스크 필드 수정 (status 변경은 transitions API 사용) */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const body = await request.json();

  if ("status" in body) {
    return NextResponse.json(
      { error: "Use POST /api/tasks/:taskId/transitions/:action to change status" },
      { status: 400 }
    );
  }

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
