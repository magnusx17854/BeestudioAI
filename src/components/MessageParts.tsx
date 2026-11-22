import { useState } from "react";
import {
  Brain,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  Terminal,
  FileText,
  Pencil,
  Wrench,
} from "lucide-react";
import type { ToolCall } from "@/lib/protocol";
import { Markdown } from "./Markdown";

export function ThinkingCard({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-[#8E929F] transition-colors active:bg-white/[0.08]"
      >
        <Brain size={13} className="text-[#F59E0B]" />
        <span>Thought process</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="fade-slide-up mt-2 rounded-xl border border-white/[0.06] bg-[#12141C] px-3 py-2">
          <p className="whitespace-pre-wrap text-[13px] italic leading-relaxed text-[#8E929F]">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}

function toolIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("bash") || n.includes("shell") || n.includes("exec"))
    return Terminal;
  if (n.includes("read")) return FileText;
  if (n.includes("write") || n.includes("edit")) return Pencil;
  return Wrench;
}

function ToolCard({ tool }: { tool: ToolCall }) {
  const [open, setOpen] = useState(false);
  const Icon = toolIcon(tool.name);
  const hasDetail = tool.args !== undefined || tool.output;

  return (
    <div className="mb-1.5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141C]">
      <button
        onClick={() => hasDetail && setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/10">
          <Icon size={13} className="text-[#F59E0B]" />
        </span>
        <span className="flex-1 truncate font-mono text-[12px] text-[#C9CBD4]">
          {tool.name}
        </span>
        {tool.status === "running" && (
          <Loader2 size={14} className="shrink-0 animate-spin text-[#F59E0B]" />
        )}
        {tool.status === "success" && (
          <Check size={14} className="shrink-0 text-emerald-400" />
        )}
        {tool.status === "error" && (
          <AlertCircle size={14} className="shrink-0 text-red-400" />
        )}
        {hasDetail && (
          <ChevronDown
            size={13}
            className={`shrink-0 text-[#8E929F] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>
      {open && (
        <div className="fade-slide-up border-t border-white/[0.06] px-3 py-2">
          {tool.args !== undefined && (
            <pre className="mb-2 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/30 p-2 font-mono text-[11px] leading-relaxed text-[#8E929F]">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          )}
          {tool.output && (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/30 p-2 font-mono text-[11px] leading-relaxed text-[#AEB2BD]">
              {tool.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolCardList({ tools }: { tools?: ToolCall[] }) {
  if (!tools || tools.length === 0) return null;
  return (
    <div className="mb-2 space-y-0">
      {tools.map((tool) => (
        <ToolCard key={tool.toolCallId} tool={tool} />
      ))}
    </div>
  );
}

export function AssistantActions({
  text,
  onRegenerate,
}: {
  text: string;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="mt-1.5 flex items-center gap-1">
      <button
        onClick={copy}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[#8E929F] transition-colors hover:bg-white/[0.05] hover:text-[#ECECF1]"
      >
        {copied ? (
          <Check size={13} className="text-emerald-400" />
        ) : (
          <Copy size={13} />
        )}
        {copied ? "Copied!" : "Copy"}
      </button>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[#8E929F] transition-colors hover:bg-white/[0.05] hover:text-[#ECECF1]"
        >
          <Wrench size={13} />
          Regenerate
        </button>
      )}
    </div>
  );
}

export function AssistantMarkdown({ text }: { text: string }) {
  return <Markdown text={text} />;
}
