import { Menu, SquarePen } from "lucide-react";
import { BeeMark } from "./BeeMark";

export function Header({
  status,
  modelLabel,
  onMenu,
  onNewChat,
  onModelPillTap,
}: {
  status: "connecting" | "connected" | "reconnecting" | "offline";
  modelLabel: string;
  onMenu: () => void;
  onNewChat: () => void;
  onModelPillTap: () => void;
}) {
  const dot =
    status === "connected"
      ? "bg-emerald-400"
      : status === "reconnecting"
        ? "animate-pulse bg-[#F59E0B]"
        : "bg-[#5A5E6A]";

  return (
    <header className="glass sticky top-0 z-30 h-14 border-b border-white/[0.08]">
      <div className="mx-auto flex h-full max-w-2xl items-center justify-between px-3">
        <button
          onClick={onMenu}
          className="rounded-xl p-2 text-[#C9CBD4] transition-colors hover:bg-white/[0.06] hover:text-[#ECECF1]"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <BeeMark size={20} />
          <span className="text-[15px] font-semibold tracking-tight text-[#ECECF1]">
            BeeStudio
          </span>
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <button
            onClick={onModelPillTap}
            className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#8E929F] transition-colors hover:text-[#ECECF1]"
          >
            <span className="max-w-[120px] truncate">{modelLabel}</span>
            <span className="text-[9px] opacity-70">▾</span>
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="rounded-xl p-2 text-[#C9CBD4] transition-colors hover:bg-white/[0.06] hover:text-[#ECECF1]"
          aria-label="New session"
        >
          <SquarePen size={19} />
        </button>
      </div>
    </header>
  );
}
