"use client";

import { useExecutionLogs } from "@/hooks/useTasks";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ExecutionLog as ExecutionLogType } from "@/types";

interface ExecutionLogProps {
  taskId: string;
  isActive?: boolean;
}

const STREAM_COLORS: Record<string, string> = {
  stdout: "text-gray-200",
  stderr: "text-red-400",
  system: "text-blue-400",
};

function parseResultText(logs: ExecutionLogType[]): string | null {
  const stdoutContent = logs
    .filter((l) => l.stream === "stdout")
    .map((l) => l.content)
    .join("");

  const lines = stdoutContent.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.type === "result" && typeof event.result === "string") {
        return event.result;
      }
    } catch {
      // partial JSON line, skip
    }
  }
  return null;
}

function getErrorLogs(logs: ExecutionLogType[]): ExecutionLogType[] {
  return logs.filter((l) => l.stream === "stderr" || l.stream === "system");
}

export default function ExecutionLog({ taskId, isActive = false }: ExecutionLogProps) {
  const { logs, isLoading } = useExecutionLogs(taskId, isActive);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (isLoading) {
    return <div className="text-sm text-gray-400 p-4">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-400 p-4">No execution logs yet.</div>
    );
  }

  const resultText = parseResultText(logs);
  const errorLogs = getErrorLogs(logs);

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-medium">Execution Logs</span>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          {showRaw ? "요약 보기" : "상세 보기"}
        </button>
      </div>

      <div className="p-4 overflow-y-auto max-h-[500px]">
        {showRaw ? (
          /* Raw log view - existing behavior */
          <div className="font-mono text-xs">
            {logs.map((log) => (
              <div key={log.id} className={`${STREAM_COLORS[log.stream] || "text-gray-300"} whitespace-pre-wrap break-all`}>
                <span className="text-gray-600 select-none">
                  [{new Date(log.timestamp).toLocaleTimeString()}]{" "}
                </span>
                {log.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          /* Summary view */
          <div>
            {resultText ? (
              <div className="markdown-content prose-sm prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {resultText}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                실행 중...
              </div>
            )}

            {errorLogs.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-500 mb-1">Errors / System</div>
                <div className="font-mono text-xs space-y-0.5">
                  {errorLogs.map((log) => (
                    <div key={log.id} className={`${STREAM_COLORS[log.stream]} whitespace-pre-wrap break-all`}>
                      {log.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
