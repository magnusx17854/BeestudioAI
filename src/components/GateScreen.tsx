import { useState } from "react";
import { Eye, EyeOff, ChevronDown, Loader2 } from "lucide-react";
import { BeeMark } from "./BeeMark";

export function GateScreen({
  initialPassword,
  initialServerUrl,
  error,
  verifying,
  onSubmit,
}: {
  initialPassword: string;
  initialServerUrl: string;
  error: string | null;
  verifying: boolean;
  onSubmit: (password: string, serverUrl: string) => void;
}) {
  const [password, setPassword] = useState(initialPassword);
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [showPw, setShowPw] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || verifying) return;
    onSubmit(password.trim(), serverUrl.trim());
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#0D0F14] px-6">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.13]"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.8) 0%, rgba(245,158,11,0.18) 45%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="bee-glow mb-6">
          <BeeMark size={76} />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-[#ECECF1]">
          BeeStudio AI
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8E929F]">
          Private Agentic Workspace
        </p>

        <form onSubmit={handleSubmit} className="mt-9 w-full space-y-3.5">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="text"
              className="h-12 w-full rounded-2xl border border-white/10 bg-[#151821] px-4 pr-12 text-[16px] text-[#ECECF1] placeholder-[#5A5E6A] outline-none transition-colors focus:border-[#F59E0B]/60 focus:ring-2 focus:ring-[#F59E0B]/15"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8E929F] transition-colors hover:text-[#ECECF1]"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151821]">
            <button
              type="button"
              onClick={() => setServerOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-[13px] text-[#8E929F]"
            >
              <span>Remote Server URL (for .trycloudflare.com or Railway)</span>
              <ChevronDown
                size={15}
                className={`shrink-0 transition-transform duration-200 ${
                  serverOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {serverOpen && (
              <div className="fade-slide-up px-3 pb-3">
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://your-app.trycloudflare.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0D0F14] px-3 text-[14px] text-[#ECECF1] placeholder-[#5A5E6A] outline-none transition-colors focus:border-[#F59E0B]/60"
                />
                <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-[#5A5E6A]">
                  Leave empty to use this site's own address.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="banner-in rounded-xl border border-red-500/25 bg-red-500/[0.08] px-3.5 py-2.5 text-[13px] leading-relaxed text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!password.trim() || verifying}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#F59E0B] text-[15px] font-semibold text-[#0D0F14] shadow-[0_8px_28px_-8px_rgba(245,158,11,0.55)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            {verifying && <Loader2 size={17} className="animate-spin" />}
            {verifying ? "Connecting..." : "Unlock Studio"}
          </button>
        </form>
      </div>
    </div>
  );
}
