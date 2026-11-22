import type { ChatMessage, ToolCall } from "./protocol";
import { extractToolOutput, newId } from "./protocol";

export interface StreamCallbacks {
  onTextDelta: (delta: string) => void;
  onThinkingDelta: (delta: string) => void;
  onToolStart: (tool: ToolCall) => void;
  onToolEnd: (toolCallId: string, output: unknown, isError: boolean) => void;
  onTurnComplete: (finalBlocks: { type: string; text?: string }[]) => void;
  onError: (message: string) => void;
  onState: (state: Record<string, unknown>) => void;
  onSessionPath: (sessionPath: string) => void;
  onModel: (provider: string, modelId: string) => void;
}

export function handleEvent(
  event: Record<string, unknown>,
  cb: StreamCallbacks
): void {
  const type = typeof event.type === "string" ? event.type : "";

  switch (type) {
    case "connection_established":
    case "turn_start":
    case "turn_end":
    case "message_start":
      break;

    case "state": {
      const state = (event.state ?? {}) as Record<string, unknown>;
      cb.onState(state);
      break;
    }

    case "message_update": {
      const ame = event.assistantMessageEvent as
        | { type?: string; delta?: string }
        | undefined;
      const kind = ame?.type ?? "";
      const delta = ame?.delta ?? (event.delta as string | undefined) ?? "";
      if (!delta) return;
      if (kind === "text_delta") cb.onTextDelta(delta);
      else if (kind === "thinking_delta") cb.onThinkingDelta(delta);
      return;
    }

    case "tool_execution_start": {
      const toolCallId =
        (event.toolCallId as string) ??
        (event.tool_call_id as string) ??
        (event.id as string) ??
        newId();
      const name =
        (event.toolName as string) ??
        (event.tool_name as string) ??
        (event.name as string) ??
        "tool";
      const args =
        (event.args as unknown) ??
        (event.input as unknown) ??
        (event.params as unknown);
      cb.onToolStart({ toolCallId, name, args, status: "running" });
      return;
    }

    case "tool_execution_end": {
      const toolCallId =
        (event.toolCallId as string) ??
        (event.tool_call_id as string) ??
        (event.id as string) ??
        "";
      const isError =
        event.success === false ||
        event.isError === true ||
        event.is_error === true ||
        (typeof event.status === "string" && event.status === "error");
      cb.onToolEnd(toolCallId, event.output ?? event.result, isError);
      return;
    }

    case "message_end":
    case "agent_end":
    case "session_settled":
    case "prompt_result": {
      const message = event.message as
        | { content?: { type: string; text?: string }[] }
        | undefined;
      const blocks =
        message?.content ??
        (event.content as { type: string; text?: string }[] | undefined) ??
        [];
      cb.onTurnComplete(Array.isArray(blocks) ? blocks : []);
      return;
    }

    case "response": {
      if (event.success === false) {
        const err = (event.error ?? event.message) as unknown;
        cb.onError(
          typeof err === "string" ? err : JSON.stringify(err) || "Request failed"
        );
      }
      return;
    }

    case "extension_error":
    case "stderr": {
      const raw =
        event.error ?? event.message ?? event.data ?? event.line ?? event;
      const msg =
        typeof raw === "string" ? raw : safeJson(raw);
      cb.onError(msg.slice(0, 400));
      return;
    }

    case "session_set": {
      const path =
        (event.sessionPath as string) ??
        (event.session_path as string) ??
        ((event.session as { path?: string } | undefined)?.path ?? "");
      if (path) cb.onSessionPath(path);
      return;
    }

    case "model_set": {
      const provider = (event.provider as string) ?? "";
      const modelId =
        (event.modelId as string) ??
        (event.model_id as string) ??
        (event.model as string) ??
        "";
      if (modelId) cb.onModel(provider, modelId);
      return;
    }

    default:
      break;
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function collectFinalText(
  blocks: { type: string; text?: string }[]
): string {
  return blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}

export function assistantMessage(
  id: string,
  patch: Partial<ChatMessage>
): ChatMessage {
  return { id, role: "assistant", text: "", tools: [], streaming: true, ...patch };
}
