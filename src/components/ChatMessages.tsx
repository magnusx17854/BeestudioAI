import { FileText, AlertCircle, X } from "lucide-react";
import type { ChatMessage } from "@/lib/protocol";
import { BeeMark } from "./BeeMark";
import { Markdown } from "./Markdown";
import {
  AssistantActions,
  ThinkingCard,
  ToolCardList,
} from "./MessageParts";

export function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="fade-slide-up flex flex-col items-end">
      {message.files && message.files.length > 0 && (
        <div className="mb-1.5 flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {message.files.map((file) => (
            <span
              key={file.path}
              className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/[0.08] py-1 pl-2 pr-2.5 text-[11px] text-[#F5C06B]"
            >
              <FileText size={11} className="shrink-0" />
              <span className="truncate">{file.path}</span>
            </span>
          ))}
        </div>
      )}
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-[#1E222E] px-4 py-3 text-[15px] leading-relaxed text-[#ECECF1] shadow-sm">
        {message.text}
      </div>
    </div>
  );
}

export function AssistantMessage({
  message,
  onRegenerate,
}: {
  message: ChatMessage;
  onRegenerate?: () => void;
}) {
  const empty = !message.text && !message.thinking && !message.tools?.length;

  return (
    <div className="fade-slide-up">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F59E0B]/12">
          <BeeMark size={16} />
        </span>
        <span className="text-[12px] font-medium text-[#8E929F]">Bee</span>
      </div>

      {message.thinking && <ThinkingCard text={message.thinking} />}
      <ToolCardList tools={message.tools} />

      {empty && message.streaming ? (
        <div className="flex items-center gap-1 py-1" aria-label="Bee is thinking">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F59E0B]" />
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F59E0B]"
            style={{ animationDelay: "0.18s" }}
          />
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F59E0B]"
            style={{ animationDelay: "0.36s" }}
          />
        </div>
      ) : (
        <Markdown text={message.text} />
      )}

      {message.streaming && message.text && (
        <span className="stream-caret" aria-hidden />
      )}

      {!message.streaming && message.text && (
        <AssistantActions text={message.text} onRegenerate={onRegenerate} />
      )}
    </div>
  );
}

export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="banner-in flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-3.5 py-3">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
      <p className="flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-red-300">
        {message}
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-red-300/70 transition-colors hover:bg-white/[0.06] hover:text-red-200"
        aria-label="Dismiss error"
      >
        <X size={14} />
      </button>
    </div>
  );
}
