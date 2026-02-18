import { NextRequest, NextResponse } from "next/server";
import { updateTask, getTask } from "@/lib/services/taskService";
import { resolveTransition, dispatchAction } from "@/lib/services/transitionService";
import { TaskStatus } from "@/types";

/** PUT /api/board/reorder — 칸반 보드에서 태스크 드래그 시 상태·위치 변경 */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { taskId, status, position } = body;

  if (!taskId || !status || position === undefined) {
    return NextResponse.json(
      { error: "taskId, status, and position are required" },
      { status: 400 }
    );
  }

  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const fromStatus = task.status as TaskStatus;
  const toStatus = status as TaskStatus;

  if (fromStatus !== toStatus) {
    // Cross-column move — validate transition
    const action = resolveTransition(fromStatus, toStatus);

    if (action === null) {
      return NextResponse.json(
        { error: `Cannot move from '${fromStatus}' to '${toStatus}' via drag` },
        { status: 400 }
      );
    }

    const result = await dispatchAction(action, taskId);
    if (!result) {
      return NextResponse.json(
        { error: `Unknown transition action: ${action}` },
        { status: 400 }
      );
    }
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === "NOT_FOUND" ? 404 : 400 }
      );
    }

    // Update position after successful transition
    const updated = await updateTask(taskId, { position });
    return NextResponse.json(updated);
  }

  // Same column — just update position
  const updated = await updateTask(taskId, { position });
  return NextResponse.json(updated);
}
