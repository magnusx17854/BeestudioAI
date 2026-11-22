import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AttachedFile,
  BeeState,
  ChatMessage,
  ConnectionStatus,
  ToolCall,
} from "@/lib/protocol";
import {
  MODEL_PRESETS,
  clearCredentials,
  extractToolOutput,
  getSavedPassword,
  getSavedServerUrl,
  newId,
  resolveBaseUrl,
  saveCredentials,
  send,
  verifyPassword,
  wsUrl,
} from "@/lib/protocol";
import { collectFinalText, handleEvent } from "@/lib/events";
import type { StreamCallbacks } from "@/lib/events";
import { GateScreen } from "@/components/GateScreen";
import { Header } from "@/components/Header";
import { HeroEmptyState } from "@/components/HeroEmptyState";
import { Composer } from "@/components/Composer";
import { Drawer } from "@/components/Drawer";
import type { ApiFile } from "@/components/Drawer";
import { AssistantMessage, ErrorBanner, UserMessage } from "@/components/ChatMessages";

type Phase = "gate" | "verifying" | "workspace";

export default function App() {
  const [phase, setPhase] = useState<Phase>("gate");
  const [gateError, setGateError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(getSavedServerUrl);
  const [password, setPassword] = useState("");

  const [connection, setConnection] = useState<ConnectionStatus>("offline");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [activeModelId, setActiveModelId] = useState("openrouter/free");
  const [extraModels, setExtraModels] = useState<string[]>([]);
  const [activeSessionPath, setActiveSessionPath] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);
  const activeAssistantIdRef = useRef<string | null>(null);
  const pendingActionRef = useRef<null | "steer" | "queue">(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const baseUrl = useMemo(() => resolveBaseUrl(serverUrl), [serverUrl]);

  /* ---------- streaming state helpers ---------- */

  const patchActiveAssistant = useCallback(
    (patch: (msg: ChatMessage) => ChatMessage) => {
      const id = activeAssistantIdRef.current;
      if (!id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? patch(m) : m))
      );
    },
    []
  );

  const ensureActiveAssistant = useCallback((id: string) => {
    if (!activeAssistantIdRef.current) activeAssistantIdRef.current = id;
  }, []);

  const callbacks: StreamCallbacks = useMemo(
    () => ({
      onTextDelta: (delta) =>
        patchActiveAssistant((m) => ({ ...m, text: m.text + delta })),
      onThinkingDelta: (delta) =>
        patchActiveAssistant((m) => ({
          ...m,
          thinking: (m.thinking ?? "") + delta,
        })),
      onToolStart: (tool: ToolCall) =>
        patchActiveAssistant((m) => {
          const tools = m.tools ?? [];
          return tools.some((t) => t.toolCallId === tool.toolCallId)
            ? {
                ...m,
                tools: tools.map((t) =>
                  t.toolCallId === tool.toolCallId ? { ...t, ...tool } : t
                ),
              }
            : { ...m, tools: [...tools, tool] };
        }),
      onToolEnd: (toolCallId, output, isError) =>
        patchActiveAssistant((m) => ({
          ...m,
          tools: (m.tools ?? []).map((t) =>
            t.toolCallId === toolCallId
              ? {
                  ...t,
                  status: isError ? "error" : "success",
                  output: extractToolOutput(output),
                }
              : t
          ),
        })),
      onTurnComplete: (blocks) => {
        const finalText = collectFinalText(blocks);
        if (finalText) {
          patchActiveAssistant((m) =>
            m.text.trim() ? m : { ...m, text: finalText }
          );
        }
        setIsStreaming(false);
        setIsQueued(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === activeAssistantIdRef.current
              ? { ...m, streaming: false }
              : m
          )
        );
        activeAssistantIdRef.current = null;
        pendingActionRef.current = null;
      },
      onError: (message) => {
        setBanner(message);
        setIsStreaming(false);
        setIsQueued(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === activeAssistantIdRef.current
              ? { ...m, streaming: false }
              : m
          )
        );
        activeAssistantIdRef.current = null;
        pendingActionRef.current = null;
      },
      onState: (state: BeeState) => {
        const model = state.model as { provider?: string; modelId?: string } | undefined;
        if (model?.modelId) setActiveModelId(model.modelId);
        const list =
          (state.activeModels as string[] | undefined) ??
          (state.models as string[] | undefined) ??
          [];
        if (Array.isArray(list)) setExtraModels(list.filter((m): m is string => typeof m === "string"));
        if (typeof state.sessionPath === "string" && state.sessionPath)
          setActiveSessionPath(state.sessionPath);
      },
      onSessionPath: (path) => setActiveSessionPath(path),
      onModel: (_provider, modelId) => setActiveModelId(modelId),
    }),
    [patchActiveAssistant]
  );

  /* ---------- websocket lifecycle ---------- */

  const startTurn = useCallback(
    (kind: "user" | "steer" | "queue", text: string, attached: AttachedFile[]) => {
      if (kind !== "steer") {
        const userMsg: ChatMessage = {
          id: newId(),
          role: "user",
          text,
          files: attached.length ? attached : undefined,
        };
        const assistantMsg: ChatMessage = {
          id: newId(),
          role: "assistant",
          text: "",
          tools: [],
          streaming: true,
        };
        activeAssistantIdRef.current = assistantMsg.id;
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        if (kind === "user") setIsStreaming(true);
        else setIsQueued(true);
      } else {
        setIsStreaming(true);
      }
    },
    []
  );

  const dispatchPrompt = useCallback(
    (method: "prompt" | "steer" | "follow_up", text: string) => {
      const ok = send(wsRef.current, method, { message: text });
      if (!ok) {
        setBanner("Not connected to the Bee server. Check your connection.");
        return false;
      }
      return true;
    },
    []
  );

  const submit = useCallback(
    (rawText: string, attached: AttachedFile[]) => {
      const text = rawText.trim();
      if (!text && attached.length === 0) return;

      const fileContext = attached.length
        ? attached
            .map((f) => `@file ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
            .join("\n\n")
        : "";
      const fullMessage = fileContext ? `${fileContext}\n\n${text}` : text;

      setInput("");
      setFiles([]);
      startTurn("user", text, attached);
      if (!dispatchPrompt("prompt", fullMessage)) {
        setIsStreaming(false);
      }
    },
    [dispatchPrompt, startTurn]
  );

  const steer = useCallback(() => {
    const text = input.trim();
    if (!text || !activeAssistantIdRef.current) return;
    if (!dispatchPrompt("steer", text)) return;
    setInput("");
    startTurn("steer", text, []);
  }, [dispatchPrompt, input, startTurn]);

  const followUp = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    if (!dispatchPrompt("follow_up", text)) return;
    setInput("");
    pendingActionRef.current = "queue";
    setIsQueued(true);
  }, [dispatchPrompt, input]);

  const stop = useCallback(() => {
    send(wsRef.current, "abort", {});
    setIsStreaming(false);
    setIsQueued(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === activeAssistantIdRef.current ? { ...m, streaming: false } : m
      )
    );
    activeAssistantIdRef.current = null;
  }, []);

  const regenerate = useCallback(
    (assistantId: string) => {
      if (isStreaming) return;
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === assistantId);
        if (index < 1) return prev;
        const lastUser = [...prev.slice(0, index)]
          .reverse()
          .find((m) => m.role === "user");
        if (!lastUser) return prev;

        const assistantMsg: ChatMessage = {
          id: newId(),
          role: "assistant",
          text: "",
          tools: [],
          streaming: true,
        };
        activeAssistantIdRef.current = assistantMsg.id;
        setMessages((current) => [...current, assistantMsg]);
        setIsStreaming(true);
        const ok = send(wsRef.current, "prompt", { message: lastUser.text });
        if (!ok) {
          setIsStreaming(false);
          setBanner("Not connected to the Bee server. Check your connection.");
        }
        return prev;
      });
    },
    [isStreaming]
  );

  const newSession = useCallback(() => {
    setMessages([]);
    setBanner(null);
    setActiveSessionPath("");
    activeAssistantIdRef.current = null;
    send(wsRef.current, "new_session", {});
  }, []);

  const switchSession = useCallback((sessionPath: string) => {
    setMessages([]);
    setBanner(null);
    activeAssistantIdRef.current = null;
    send(wsRef.current, "switch_session", { sessionPath });
    setActiveSessionPath(sessionPath);
  }, []);

  const setModel = useCallback((provider: string, modelId: string) => {
    setActiveModelId(modelId);
    send(wsRef.current, "set_model", { provider, modelId });
  }, []);

  /* ---------- connection ---------- */

  const connect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (!password) return;

    setConnection(
      reconnectAttemptRef.current === 0 ? "connecting" : "reconnecting"
    );

    const ws = new WebSocket(wsUrl(baseUrl, password));
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnection("connected");
      send(ws, "get_state", {});
    };

    ws.onmessage = (event) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(event.data as string);
      } catch {
        return;
      }
      handleEvent(data, callbacks);
    };

    ws.onclose = () => {
      if (closedRef.current) return;
      setConnection("reconnecting");
      const delay = Math.min(
        30000,
        800 * Math.pow(2, reconnectAttemptRef.current)
      );
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* already closed */
      }
    };
  }, [baseUrl, password, callbacks]);

  /* ---------- gate: verify saved password on startup ---------- */

  useEffect(() => {
    const saved = getSavedPassword();
    if (!saved) return;
    setPhase("verifying");
    setPassword(saved);
    verifyPassword(resolveBaseUrl(getSavedServerUrl()), saved).then((ok) => {
      if (ok) {
        setPhase("workspace");
      } else {
        setGateError("Invalid password or unreachable server");
        setPhase("gate");
      }
    });
  }, []);

  useEffect(() => {
    if (phase !== "workspace") return;
    closedRef.current = false;
    connect();
    return () => {
      closedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
    };
  }, [phase, connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, banner]);

  /* ---------- gate submit ---------- */

  const handleGateSubmit = useCallback(
    (pw: string, url: string) => {
      setGateError(null);
      setPhase("verifying");
      verifyPassword(resolveBaseUrl(url), pw).then((ok) => {
        if (!ok) {
          setGateError("Invalid password or unreachable server");
          setPhase("gate");
          return;
        }
        saveCredentials(pw, url);
        setServerUrl(url);
        setPassword(pw);
        setPhase("workspace");
      });
    },
    []
  );

  const handleLogout = useCallback(() => {
    closedRef.current = true;
    try {
      wsRef.current?.close();
    } catch {
      /* noop */
    }
    clearCredentials();
    setPassword("");
    setMessages([]);
    setInput("");
    setFiles([]);
    setDrawerOpen(false);
    setConnection("offline");
    setPhase("gate");
  }, []);

  /* ---------- REST bridges for the drawer ---------- */

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${password}` }),
    [password]
  );

  const openFile = useCallback(
    async (path: string): Promise<ApiFile> => {
      const res = await fetch(
        `${baseUrl}/api/file?path=${encodeURIComponent(path)}`,
        { headers: authHeaders }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return {
        path: (body.path as string) ?? path,
        content:
          (body.content as string) ?? (body.text as string) ?? (body.data as string) ?? "",
      };
    },
    [baseUrl, authHeaders]
  );

  const saveFile = useCallback(
    async (path: string, content: string) => {
      const res = await fetch(`${baseUrl}/api/file`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    [baseUrl, authHeaders]
  );

  const attachFile = useCallback(async (path: string) => {
    setDrawerOpen(false);
    setPhase((current) => current);
    try {
      const file = await openFile(path);
      setFiles((prev) =>
        prev.some((f) => f.path === path)
          ? prev
          : [...prev, { path, content: file.content }]
      );
    } catch {
      setBanner(`Couldn't read @${path} to attach.`);
    }
  }, [openFile]);

  const onAttachLocal = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = typeof reader.result === "string" ? reader.result : "";
        setFiles((prev) =>
          prev.some((f) => f.path === file.name)
            ? prev
            : [...prev, { path: file.name, content }]
        );
      };
      reader.readAsText(file);
    });
  }, []);

  const modelLabel = useMemo(() => {
    const preset = MODEL_PRESETS.find((p) => p.modelId === activeModelId);
    return preset ? preset.label : activeModelId;
  }, [activeModelId]);

  /* ---------- render ---------- */

  if (phase !== "workspace") {
    return (
      <GateScreen
        initialPassword={getSavedPassword() ?? ""}
        initialServerUrl={getSavedServerUrl()}
        error={gateError}
        verifying={phase === "verifying"}
        onSubmit={handleGateSubmit}
      />
    );
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0D0F14]">
      <Header
        status={connection}
        modelLabel={modelLabel}
        onMenu={() => setDrawerOpen(true)}
        onNewChat={newSession}
        onModelPillTap={() => setDrawerOpen(true)}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {empty ? (
            <HeroEmptyState onPick={(prompt) => submit(prompt, [])} />
          ) : (
            <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
              {messages.map((message) =>
                message.role === "user" ? (
                  <UserMessage key={message.id} message={message} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    onRegenerate={
                      message.role === "assistant" && !isStreaming
                        ? () => regenerate(message.id)
                        : undefined
                    }
                  />
                )
              )}
              {banner && (
                <ErrorBanner message={banner} onDismiss={() => setBanner(null)} />
              )}
              <div ref={bottomRef} className="h-1" />
            </div>
          )}
        </div>

        <Composer
          value={input}
          onChange={setInput}
          onSend={() => submit(input, files)}
          onStop={stop}
          isStreaming={isStreaming}
          isQueued={isQueued}
          onSteer={steer}
          onFollowUp={followUp}
          files={files}
          onAttach={onAttachLocal}
          onRemoveFile={(path) =>
            setFiles((prev) => prev.filter((f) => f.path !== path))
          }
          modelLabel={modelLabel}
          onModelPillTap={() => setDrawerOpen(true)}
        />
      </main>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        baseUrl={baseUrl}
        password={password}
        serverUrl={serverUrl}
        activeSessionPath={activeSessionPath}
        activeModelId={activeModelId}
        extraModels={extraModels}
        onNewChat={newSession}
        onSwitchSession={switchSession}
        onSetModel={setModel}
        onOpenFile={openFile}
        onSaveFile={saveFile}
        onAttachFile={attachFile}
        onServerUrlChange={(url) => {
          setServerUrl(url);
          saveCredentials(password, url);
        }}
        onLogout={handleLogout}
      />
    </div>
  );
}
