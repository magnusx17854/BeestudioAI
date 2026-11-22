import { useEffect, useRef } from "react";
import {
  ArrowUp,
  Square,
  Paperclip,
  AtSign,
  ChevronDown,
  X,
  Compass,
  CornerDownRight,
} from "lucide-react";
import type { AttachedFile } from "@/lib/protocol";

function FileChips({
  files,
  onRemove,
}: {
  files: AttachedFile[];
  onRemove: (path: string) => void;
}) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-1.5">
      {files.map((file) => (
        <span
          key={file.path}
          className="flex max-w-[240px] items-center gap-1.5 rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/[0.09] py-1 pl-2.5 pr-1.5 text-[11px] text-[#F5C06B]"
        >
          <span className="truncate">@{file.path}</span>
          <button
            onClick={() => onRemove(file.path)}
            className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-white/[0.12]"
            aria-label={`Remove ${file.path}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  isQueued,
  onSteer,
  onFollowUp,
  files,
  onAttach,
  onRemoveFile,
  modelLabel,
  onModelPillTap,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  isQueued: boolean;
  onSteer: () => void;
  onFollowUp: () => void;
  files: AttachedFile[];
  onAttach: (files: FileList | null) => void;
  onRemoveFile: (path: string) => void;
  modelLabel: string;
  onModelPillTap: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 || files.length > 0;
  const actionDisabled = isStreaming ? !canSend : !canSend;

  return (
    <div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-2xl">
        {isStreaming && (
          <div className="fade-slide-up mb-2 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#161922]/95 px-1.5 py-1.5 shadow-lg backdrop-blur">
            <button
              onClick={onSteer}
              disabled={!canSend}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-[12px] font-medium text-[#C9CBD4] transition-colors hover:bg-white/[0.06] disabled:opacity-35"
            >
              <Compass size={13} className="text-[#F59E0B]" />
              Steer
            </button>
            <span className="h-4 w-px bg-white/10" />
            <button
              onClick={onFollowUp}
              disabled={!canSend}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-[12px] font-medium text-[#C9CBD4] transition-colors hover:bg-white/[0.06] disabled:opacity-35"
            >
              <CornerDownRight size={13} className="text-emerald-400" />
              Follow-up
            </button>
            <span className="h-4 w-px bg-white/10" />
            <button
              onClick={onStop}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-[12px] font-medium text-red-300 transition-colors hover:bg-red-500/10"
            >
              <Square size={11} className="fill-current" />
              Stop
            </button>
          </div>
        )}

        <div className="rounded-[24px] border border-white/10 bg-[#161922] shadow-xl">
          <FileChips files={files} onRemove={onRemoveFile} />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isStreaming && canSend) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask BeeStudio anything..."
            rows={1}
            className="min-h-[48px] max-h-[150px] w-full resize-none bg-transparent px-4 pt-3.5 text-[16px] leading-relaxed text-[#ECECF1] placeholder-[#5A5E6A] focus:outline-none"
          />

          <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  onAttach(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full p-2 text-[#8E929F] transition-colors hover:bg-white/[0.06] hover:text-[#ECECF1]"
                aria-label="Attach file"
              >
                <Paperclip size={17} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full p-2 text-[#8E929F] transition-colors hover:bg-white/[0.06] hover:text-[#ECECF1]"
                aria-label="Mention a workspace file"
              >
                <AtSign size={17} />
              </button>
              <button
                onClick={onModelPillTap}
                className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#8E929F] transition-colors hover:text-[#ECECF1]"
              >
                {modelLabel}
                <ChevronDown size={12} />
              </button>
            </div>

            <button
              onClick={isStreaming ? onStop : onSend}
              disabled={actionDisabled && !isStreaming}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-30 ${
                isStreaming
                  ? "bg-red-500 text-white"
                  : "bg-[#F59E0B] text-[#0D0F14] shadow-[0_4px_14px_-4px_rgba(245,158,11,0.6)]"
              }`}
              aria-label={isStreaming ? "Stop generating" : "Send message"}
            >
              {isStreaming ? (
                <Square size={14} className="fill-current" />
              ) : (
                <ArrowUp size={17} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
