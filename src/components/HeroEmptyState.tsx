import { FolderSearch, HeartPulse, Activity, Code2 } from "lucide-react";
import { BeeMark } from "./BeeMark";

const STARTERS = [
  {
    icon: FolderSearch,
    title: "Workspace Audit",
    subtitle: "Inspect files and status in rea-work",
    prompt:
      "Audit the workspace: list the files in rea-work and summarize the current state of the project.",
  },
  {
    icon: HeartPulse,
    title: "Engine Health",
    subtitle: "Check Bee-RPengine keys and active models",
    prompt:
      "Check Bee-RPengine health: verify API keys are valid and report which models are currently active.",
  },
  {
    icon: Activity,
    title: "Run Diagnostics",
    subtitle: "Verify running services and logs",
    prompt:
      "Run diagnostics: check which services are running and surface anything unusual in their recent logs.",
  },
  {
    icon: Code2,
    title: "Code & Refactor",
    subtitle: "Edit files with live tool execution",
    prompt:
      "Pick the most impactful file in the workspace and refactor it for clarity, showing each edit with tool execution.",
  },
];

export function HeroEmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="fade-slide-up flex min-h-full flex-col items-center justify-center px-5 py-10">
      <div className="bee-glow mb-5">
        <BeeMark size={64} />
      </div>
      <h1 className="text-center text-[22px] font-semibold tracking-tight text-[#ECECF1]">
        What are we building today?
      </h1>
      <p className="mt-2 max-w-[300px] text-center text-[13px] leading-relaxed text-[#8E929F]">
        Connected to Pi RPC Engine • Code, Scraping &amp; Reverse Engineering
      </p>

      <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-2.5">
        {STARTERS.map((starter) => (
          <button
            key={starter.title}
            onClick={() => onPick(starter.prompt)}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-white/[0.08] bg-[#151821] p-3.5 text-left transition-all duration-200 hover:border-[#F59E0B]/30 hover:bg-[#181B26] active:scale-[0.97]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F59E0B]/10 transition-colors group-hover:bg-[#F59E0B]/15">
              <starter.icon size={15} className="text-[#F59E0B]" />
            </span>
            <span>
              <span className="block text-[13px] font-medium text-[#ECECF1]">
                {starter.title}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-[#8E929F]">
                {starter.subtitle}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
