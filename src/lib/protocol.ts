export interface AttachedFile {
  path: string;
  content: string;
}

export interface ToolCall {
  toolCallId: string;
  name: string;
  args?: unknown;
  output?: string;
  status: "running" | "success" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  thinking?: string;
  files?: AttachedFile[];
  tools?: ToolCall[];
  streaming?: boolean;
}

export interface ModelPreset {
  provider: string;
  modelId: string;
  label: string;
}

export const MODEL_PRESETS: ModelPreset[] = [
  { provider: "openrouter", modelId: "openrouter/free", label: "openrouter/free" },
  { provider: "openrouter", modelId: "openai/gpt-oss-120b", label: "gpt-oss-120b" },
  {
    provider: "openrouter",
    modelId: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "llama-4-scout",
  },
  { provider: "openrouter", modelId: "gemini-3.5-flash-lite", label: "gemini-3.5-flash-lite" },
];

export interface BeeState {
  model?: { provider?: string; modelId?: string };
  activeModels?: string[];
  models?: string[];
  sessionPath?: string;
  sessions?: unknown[];
  cwd?: string;
  [key: string]: unknown;
}

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

const STORAGE = {
  password: "beestudio_password",
  serverUrl: "beestudio_server_url",
} as const;

export function getSavedPassword(): string | null {
  return localStorage.getItem(STORAGE.password);
}

export function getSavedServerUrl(): string {
  return localStorage.getItem(STORAGE.serverUrl) ?? "";
}

export function saveCredentials(password: string, serverUrl: string) {
  localStorage.setItem(STORAGE.password, password);
  localStorage.setItem(STORAGE.serverUrl, serverUrl);
}

export function clearCredentials() {
  localStorage.removeItem(STORAGE.password);
  localStorage.removeItem(STORAGE.serverUrl);
}

export function resolveBaseUrl(serverUrl: string): string {
  const raw = serverUrl.trim();
  return raw ? raw.replace(/\/+$/, "") : window.location.origin;
}

export function wsUrl(baseUrl: string, password: string): string {
  const base = baseUrl.replace(/^http/, "ws");
  return `${base}/ws?token=${encodeURIComponent(password)}`;
}

export async function verifyPassword(
  baseUrl: string,
  password: string
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Authorization: `Bearer ${password}` },
    });
    if (res.status === 401) return false;
    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}

export type OutgoingMethod =
  | "get_state"
  | "prompt"
  | "steer"
  | "follow_up"
  | "abort"
  | "new_session"
  | "switch_session"
  | "set_model";

export function send(
  ws: WebSocket | null,
  method: OutgoingMethod,
  params: Record<string, unknown> = {}
): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({ method, params }));
  return true;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function extractToolOutput(output: unknown): string {
  if (output == null) return "";
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}
