"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export default function MarkdownEditor({
  content,
  onChange,
  readOnly = false,
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(readOnly);
  const [localContent, setLocalContent] = useState(content);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  useEffect(() => {
    if (readOnly) setIsPreview(true);
  }, [readOnly]);

  const handleChange = useCallback(
    (value: string) => {
      setLocalContent(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(value);
      }, 500);
    },
    [onChange]
  );

  if (readOnly || isPreview) {
    return (
      <div className="relative">
        {!readOnly && (
          <button
            onClick={() => setIsPreview(false)}
            className="absolute top-2 right-2 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Edit
          </button>
        )}
        <div className="markdown-content prose-sm">
          {localContent ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {localContent}
            </ReactMarkdown>
          ) : (
            <p className="text-gray-400 italic">No content yet. Click Edit to add a plan.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setIsPreview(false)}
          className={`text-xs px-2 py-1 rounded ${
            !isPreview ? "bg-accent text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setIsPreview(true)}
          className={`text-xs px-2 py-1 rounded ${
            isPreview ? "bg-accent text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          Preview
        </button>
        <span className="text-xs text-gray-400 ml-auto">Auto-saved</span>
      </div>
      <textarea
        value={localContent}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 w-full p-3 border border-gray-200 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent min-h-[300px]"
        placeholder="Write your implementation plan in Markdown..."
      />
    </div>
  );
}
