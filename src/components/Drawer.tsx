import { useEffect, useState } from "react";
import {
  X,
  Plus,
  MessageSquare,
  Folder,
  FolderOpen,
  FileText,
  Settings,
  ChevronLeft,
  Download,
  Lock,
  Check,
  Loader2,
  FileCode2,
} from "lucide-react";
import type { ModelPreset } from "@/lib/protocol";
import { MODEL_PRESETS, resolveBaseUrl } from "@/lib/protocol";
import { BeeMark } from "./BeeMark";

type Tab = "chats" | "files" | "settings";

export interface SessionInfo {
  path: string;
  title: string;
  timestamp?: string;
}

export interface FileEntry {
  name: string;
  isDir: boolean;
  path: string;
}

export interface ApiFile {
  path: string;
  content: string;
}

export function Drawer({
  open,
  onClose,
  baseUrl,
  password,
  serverUrl,
  activeSessionPath,
  activeModelId,
  extraModels,
  onNewChat,
  onSwitchSession,
  onSetModel,
  onOpenFile,
  onSaveFile,
  onAttachFile,
  onServerUrlChange,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  baseUrl: string;
  password: string;
  serverUrl: string;
  activeSessionPath: string;
  activeModelId: string;
  extraModels: string[];
  onNewChat: () => void;
  onSwitchSession: (sessionPath: string) => void;
  onSetModel: (provider: string, modelId: string) => void;
  onOpenFile: (path: string) => Promise<ApiFile>;
  onSaveFile: (path: string, content: string) => Promise<void>;
  onAttachFile: (path: string) => void;
  onServerUrlChange: (url: string) => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("chats");

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[84vw] max-w-[340px] flex-col border-r border-white/[0.08] bg-[#11131A] transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0.28, 1)" }}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <BeeMark size={22} />
            <span className="text-[14px] font-semibold text-[#ECECF1]">
              BeeStudio
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8E929F] transition-colors hover:bg-white/[0.06] hover:text-[#ECECF1]"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pt-1">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] text-[14px] font-semibold text-[#0D0F14] shadow-[0_6px_20px_-6px_rgba(245,158,11,0.5)] transition-all active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Chat
          </button>
        </div>

        <div className="mt-3 flex gap-1 px-3">
          {(
            [
              ["chats", "Chats"],
              ["files", "Files"],
              ["settings", "Settings"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg py-2 text-[12px] font-medium transition-colors ${
                tab === key
                  ? "bg-white/[0.08] text-[#ECECF1]"
                  : "text-[#8E929F] hover:text-[#C9CBD4]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          {tab === "chats" && (
            <ChatsTab
              baseUrl={baseUrl}
              password={password}
              activeSessionPath={activeSessionPath}
              onSwitch={(p) => {
                onSwitchSession(p);
                onClose();
              }}
            />
          )}
          {tab === "files" && (
            <FilesTab
              baseUrl={baseUrl}
              password={password}
              onOpenFile={onOpenFile}
              onSaveFile={onSaveFile}
              onAttachFile={onAttachFile}
            />
          )}
          {tab === "settings" && (
            <SettingsTab
              baseUrl={baseUrl}
              serverUrl={serverUrl}
              activeModelId={activeModelId}
              extraModels={extraModels}
              onSetModel={(p, m) => {
                onSetModel(p, m);
                onClose();
              }}
              onServerUrlChange={onServerUrlChange}
              onLogout={onLogout}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ChatsTab({
  baseUrl,
  password,
  activeSessionPath,
  onSwitch,
}: {
  baseUrl: string;
  password: string;
  activeSessionPath: string;
  onSwitch: (sessionPath: string) => void;
}) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${resolveBaseUrl(baseUrl)}/api/sessions`, {
          headers: { Authorization: `Bearer ${password}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (cancelled) return;
        const list: unknown[] = Array.isArray(body)
          ? body
          : (body.sessions ?? body.data ?? body.items ?? []);
        setSessions(
          list.map((raw) => normalizeSession(raw)).filter(Boolean) as SessionInfo[]
        );
      } catch {
        if (!cancelled) setError("Couldn't load chats from the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, password]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={18} className="animate-spin text-[#8E929F]" />
      </div>
    );
  }
  if (error)
    return <p className="px-1 py-6 text-center text-[12px] text-[#8E929F]">{error}</p>;
  if (sessions.length === 0)
    return (
      <p className="px-1 py-6 text-center text-[12px] text-[#8E929F]">
        No saved chats yet.
      </p>
    );

  return (
    <div className="space-y-0.5">
      {sessions.map((session) => {
        const active =
          activeSessionPath && session.path === activeSessionPath;
        return (
          <button
            key={session.path}
            onClick={() => onSwitch(session.path)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
              active
                ? "bg-[#F59E0B]/[0.09] text-[#ECECF1]"
                : "text-[#C9CBD4] hover:bg-white/[0.05]"
            }`}
          >
            <MessageSquare
              size={14}
              className={`shrink-0 ${active ? "text-[#F59E0B]" : "text-[#8E929F]"}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px]">{session.title}</span>
              {session.timestamp && (
                <span className="block truncate text-[11px] text-[#5A5E6A]">
                  {session.timestamp}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function normalizeSession(raw: unknown): SessionInfo | null {
  if (typeof raw === "string") {
    const parts = raw.split("/");
    return {
      path: raw,
      title: parts[parts.length - 1] || raw,
    };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const path =
      (obj.path as string) ??
      (obj.sessionPath as string) ??
      (obj.session_path as string) ??
      (obj.id as string) ??
      "";
    if (!path) return null;
    const title =
      (obj.title as string) ??
      (obj.name as string) ??
      path.split("/").pop() ??
      path;
    const timestamp =
      (obj.timestamp as string) ??
      (obj.updatedAt as string) ??
      (obj.created_at as string) ??
      (obj.createdAt as string) ??
      "";
    return { path, title, timestamp: timestamp || undefined };
  }
  return null;
}

function normalizeEntries(body: unknown): FileEntry[] {
  let list: unknown[] = [];
  if (Array.isArray(body)) {
    list = body;
  } else if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    for (const key of ["entries", "files", "items"]) {
      const val = obj[key];
      if (Array.isArray(val)) {
        list = val;
        break;
      }
    }
  }
  return list
    .map((raw): FileEntry | null => {
      if (typeof raw === "string") {
        const parts = raw.split("/");
        return { name: parts[parts.length - 1] || raw, isDir: false, path: raw };
      }
      if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>;
        const name =
          (obj.name as string) ?? (obj.path as string) ?? "";
        if (!name) return null;
        const isDir =
          obj.type === "directory" ||
          obj.type === "dir" ||
          obj.isDir === true ||
          obj.isDirectory === true ||
          (typeof obj.type === "string" && obj.type.endsWith("/"));
        return {
          name,
          isDir,
          path: (obj.path as string) ?? name,
        };
      }
      return null;
    })
    .filter(Boolean) as FileEntry[];
}

function FilesTab({
  baseUrl,
  password,
  onOpenFile,
  onSaveFile,
  onAttachFile,
}: {
  baseUrl: string;
  password: string;
  onOpenFile: (path: string) => Promise<ApiFile>;
  onSaveFile: (path: string, content: string) => Promise<void>;
  onAttachFile: (path: string) => void;
}) {
  const [dir, setDir] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ApiFile | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = dir ? `?dir=${encodeURIComponent(dir)}` : "";
        const res = await fetch(
          `${resolveBaseUrl(baseUrl)}/api/files${q}`,
          { headers: { Authorization: `Bearer ${password}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (cancelled) return;
        const normalized = normalizeEntries(body);
        normalized.sort((a, b) =>
          a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1
        );
        setEntries(normalized);
      } catch {
        if (!cancelled) setError("Couldn't browse this folder.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, password, dir]);

  const openFile = async (path: string) => {
    setLoading(true);
    try {
      const file = await onOpenFile(path);
      setViewer(file);
      setDraft(file.content);
      setSaved(false);
    } catch {
      setError("Couldn't open that file.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!viewer) return;
    setSaving(true);
    try {
      await onSaveFile(viewer.path, draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch {
      setError("Couldn't save the file.");
    } finally {
      setSaving(false);
    }
  };

  if (viewer) {
    return (
      <div className="fade-slide-up">
        <button
          onClick={() => setViewer(null)}
          className="mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-[#8E929F] transition-colors hover:bg-white/[0.05] hover:text-[#ECECF1]"
        >
          <ChevronLeft size={14} /> Back to files
        </button>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-[#ECECF1]">
            <FileCode2 size={13} className="shrink-0 text-[#F59E0B]" />
            <span className="truncate">{viewer.path.split("/").pop()}</span>
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => {
                onAttachFile(viewer.path);
                setViewer(null);
              }}
              className="flex items-center gap-1 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/[0.09] px-2.5 py-1.5 text-[11px] font-medium text-[#F5C06B] transition-colors hover:bg-[#F59E0B]/15"
            >
              <Download size={12} className="rotate-180" /> Attach @file
            </button>
            <button
              onClick={save}
              disabled={saving || draft === viewer.content}
              className="flex items-center gap-1 rounded-lg bg-[#F59E0B] px-2.5 py-1.5 text-[11px] font-semibold text-[#0D0F14] transition-all disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : saved ? (
                <Check size={12} />
              ) : null}
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className="h-[52vh] w-full resize-none rounded-xl border border-white/[0.08] bg-[#0A0C10] p-3 font-mono text-[12px] leading-relaxed text-[#D7DAE0] outline-none focus:border-[#F59E0B]/40"
        />
      </div>
    );
  }

  const crumbs = dir ? dir.split("/").filter(Boolean) : [];

  return (
    <div>
      <div className="mb-1.5 flex min-h-[32px] items-center gap-1 px-1 text-[12px]">
        <button
          onClick={() => setDir("")}
          className="flex items-center gap-1 text-[#8E929F] transition-colors hover:text-[#ECECF1]"
        >
          <Folder size={13} /> workspace
        </button>
        {crumbs.map((crumb, i) => {
          const target = crumbs.slice(0, i + 1).join("/");
          return (
            <span key={i} className="flex items-center gap-1">
              <span className="text-[#5A5E6A]">/</span>
              <button
                onClick={() => setDir(target)}
                className={
                  i === crumbs.length - 1
                    ? "text-[#ECECF1]"
                    : "text-[#8E929F] transition-colors hover:text-[#ECECF1]"
                }
              >
                {crumb}
              </button>
            </span>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={18} className="animate-spin text-[#8E929F]" />
        </div>
      )}
      {error && !loading && (
        <p className="px-1 py-4 text-center text-[12px] text-[#8E929F]">{error}</p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="px-1 py-6 text-center text-[12px] text-[#8E929F]">
          This folder is empty.
        </p>
      )}

      <div className="space-y-0.5">
        {entries.map((entry) => (
          <button
            key={entry.path}
            onClick={() =>
              entry.isDir ? setDir(entry.path) : openFile(entry.path)
            }
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[#C9CBD4] transition-colors hover:bg-white/[0.05]"
          >
            {entry.isDir ? (
              <FolderOpen size={14} className="shrink-0 text-[#F59E0B]" />
            ) : (
              <FileText size={14} className="shrink-0 text-[#8E929F]" />
            )}
            <span className="truncate text-[13px]">{entry.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({
  baseUrl,
  serverUrl,
  activeModelId,
  extraModels,
  onSetModel,
  onServerUrlChange,
  onLogout,
}: {
  baseUrl: string;
  serverUrl: string;
  activeModelId: string;
  extraModels: string[];
  onSetModel: (provider: string, modelId: string) => void;
  onServerUrlChange: (url: string) => void;
  onLogout: () => void;
}) {
  const [urlDraft, setUrlDraft] = useState(serverUrl);
  const [saved, setSaved] = useState(false);

  useEffect(() => setUrlDraft(serverUrl), [serverUrl]);

  const presets: ModelPreset[] = MODEL_PRESETS;
  const extraOnly = extraModels.filter(
    (m) => !presets.some((p) => p.modelId === m)
  );

  const saveUrl = () => {
    onServerUrlChange(urlDraft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="space-y-5 py-1">
      <section>
        <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#5A5E6A]">
          Model
        </h3>
        <div className="space-y-1">
          {presets.map((preset) => (
            <button
              key={preset.modelId}
              onClick={() => onSetModel(preset.provider, preset.modelId)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${
                activeModelId === preset.modelId
                  ? "bg-[#F59E0B]/[0.09] text-[#ECECF1]"
                  : "text-[#C9CBD4] hover:bg-white/[0.05]"
              }`}
            >
              <span className="truncate">{preset.label}</span>
              {activeModelId === preset.modelId && (
                <Check size={14} className="shrink-0 text-[#F59E0B]" />
              )}
            </button>
          ))}
          {extraOnly.map((modelId) => (
            <button
              key={modelId}
              onClick={() => onSetModel("openrouter", modelId)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors ${
                activeModelId === modelId
                  ? "bg-[#F59E0B]/[0.09] text-[#ECECF1]"
                  : "text-[#C9CBD4] hover:bg-white/[0.05]"
              }`}
            >
              <span className="truncate">{modelId}</span>
              {activeModelId === modelId && (
                <Check size={14} className="shrink-0 text-[#F59E0B]" />
              )}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#5A5E6A]">
          Server
        </h3>
        <div className="rounded-xl border border-white/[0.08] bg-[#151821] p-3">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://your-app.trycloudflare.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-[#0D0F14] px-3 text-[13px] text-[#ECECF1] placeholder-[#5A5E6A] outline-none focus:border-[#F59E0B]/60"
          />
          <p className="mt-1.5 px-0.5 text-[11px] leading-relaxed text-[#5A5E6A]">
            Currently using{" "}
            <span className="break-all text-[#8E929F]">{baseUrl}</span>
          </p>
          <button
            onClick={saveUrl}
            disabled={saved}
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-white/[0.08] text-[12px] font-medium text-[#ECECF1] transition-colors hover:bg-white/[0.12] disabled:opacity-60"
          >
            {saved && <Check size={13} className="text-emerald-400" />}
            {saved ? "Saved" : "Save Server URL"}
          </button>
        </div>
      </section>

      <section>
        <button
          onClick={onLogout}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] text-[13px] font-medium text-red-300 transition-colors hover:bg-red-500/[0.12]"
        >
          <Lock size={14} />
          Lock &amp; Log Out
        </button>
      </section>
    </div>
  );
}
