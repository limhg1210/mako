import { NextRequest } from "next/server";
import { getExecutionStatus } from "@/lib/services/executionService";

/** GET /api/execute/status?taskId=xxx — SSE로 태스크 실행 상태·로그를 실시간 스트리밍 (2초 폴링) */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return new Response("taskId is required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let lastTimestamp = 0;
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const poll = async () => {
        if (cancelled) return;

        try {
          const result = await getExecutionStatus(taskId, lastTimestamp);

          if (!result) {
            sendEvent({ type: "error", message: "Task not found" });
            controller.close();
            return;
          }

          const { task, newLogs } = result;

          for (const log of newLogs) {
            sendEvent({
              type: "log",
              stream: log.stream,
              content: log.content,
              timestamp: log.timestamp,
            });
            lastTimestamp = log.timestamp;
          }

          sendEvent({
            type: "status",
            status: task.status,
            executionError: task.executionError,
          });

          if (task.status !== "working") {
            sendEvent({ type: "complete", status: task.status });
            controller.close();
            return;
          }

          if (!cancelled) {
            setTimeout(poll, 2000);
          }
        } catch (error) {
          if (!cancelled) {
            sendEvent({ type: "error", message: String(error) });
            controller.close();
          }
        }
      };

      poll();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
