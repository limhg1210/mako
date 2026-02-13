import { NextRequest, NextResponse } from "next/server";
import { getExecutionLogs } from "@/lib/services/taskService";

/** GET /api/tasks/:taskId/logs — 태스크의 Claude 실행 로그 조회 (시간순 정렬) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const logs = await getExecutionLogs(taskId);
  return NextResponse.json(logs);
}
