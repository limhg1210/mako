import { NextRequest, NextResponse } from "next/server";
import { triggerExecution } from "@/lib/services/executionService";

/** POST /api/execute — Ready 상태 태스크의 Claude 실행을 수동으로 트리거 (백그라운드 실행) */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { taskId } = body;

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const result = await triggerExecution(taskId);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Task must be in ready status to execute" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, message: "Execution started" });
}
