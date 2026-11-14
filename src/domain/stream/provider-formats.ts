import type { SseMessage } from "./sse-decoder.js";
import type { StreamEvent, StreamFormat } from "./stream-event.js";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (delta: unknown): StreamEvent[] =>
  typeof delta === "string" && delta !== "" ? [{ type: "text", delta }] : [];

const reasoning = (delta: unknown): StreamEvent[] =>
  typeof delta === "string" && delta !== "" ? [{ type: "reasoning", delta }] : [];

/** OpenAI Chat Completions: `choices[0].delta.content` (y `reasoning_content` en compatibles). */
function fromOpenAiChat(json: Json): StreamEvent[] {
  const choice = Array.isArray(json.choices) ? json.choices[0] : undefined;
  if (!isObject(choice) || !isObject(choice.delta)) return [];
  return [...reasoning(choice.delta.reasoning_content), ...text(choice.delta.content)];
}

/** OpenAI Responses API: eventos `response.output_text.delta` y de resumen de razonamiento. */
function fromOpenAiResponses(json: Json): StreamEvent[] {
  if (json.type === "response.output_text.delta") return text(json.delta);
  if (
    json.type === "response.reasoning_summary_text.delta" ||
    json.type === "response.reasoning_text.delta"
  ) {
    return reasoning(json.delta);
  }
  return [];
}

/** Anthropic Messages: `content_block_delta` con `text_delta` o `thinking_delta`. */
function fromAnthropic(json: Json): StreamEvent[] {
  if (json.type !== "content_block_delta" || !isObject(json.delta)) return [];
  if (json.delta.type === "text_delta") return text(json.delta.text);
  if (json.delta.type === "thinking_delta") return reasoning(json.delta.thinking);
  return [];
}

/** Vercel AI SDK (UI message stream, v5+): `text-delta` y `reasoning-delta`. */
function fromAiSdk(json: Json): StreamEvent[] {
  if (json.type === "text-delta") return text(json.delta ?? json.textDelta);
  if (json.type === "reasoning-delta" || json.type === "reasoning") {
    return reasoning(json.delta ?? json.textDelta ?? json.text);
  }
  return [];
}

const ANTHROPIC_TYPES = new Set([
  "message_start",
  "message_delta",
  "message_stop",
  "content_block_start",
  "content_block_delta",
  "content_block_stop",
  "ping",
]);

/** Detecta el proveedor por la forma del JSON de un evento. */
export function detectJsonFormat(json: unknown): Exclude<StreamFormat, "auto" | "text"> | null {
  if (!isObject(json)) return null;
  if (Array.isArray(json.choices)) return "openai";
  if (typeof json.type === "string") {
    if (json.type.startsWith("response.")) return "openai";
    if (ANTHROPIC_TYPES.has(json.type)) return "anthropic";
    return "ai-sdk";
  }
  return null;
}

/**
 * Convierte un mensaje SSE de cualquier proveedor soportado en eventos normalizados.
 * Ignora mensajes de control (`[DONE]`, `ping`, inicio/fin) y JSON inválido.
 */
export function eventsFromSseMessage(message: SseMessage, format: StreamFormat): StreamEvent[] {
  const data = message.data.trim();
  if (data === "" || data === "[DONE]") return [];
  if (format === "text") return text(message.data);

  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return [];
  }
  if (!isObject(json)) return [];

  const resolved = format === "auto" ? detectJsonFormat(json) : format;
  switch (resolved) {
    case "openai":
      return Array.isArray(json.choices) ? fromOpenAiChat(json) : fromOpenAiResponses(json);
    case "anthropic":
      return fromAnthropic(json);
    case "ai-sdk":
      return fromAiSdk(json);
    default:
      return [];
  }
}

/** ¿La línea parece del "data stream protocol" de AI SDK v4 (`0:"texto"`)? */
export const isDataStreamLine = (line: string): boolean => /^[0-9a-z]:/.test(line);

/** AI SDK v4 (data stream protocol): `0:"texto"` y `g:"razonamiento"`. */
export function eventsFromDataStreamLine(line: string): StreamEvent[] {
  const match = /^([0-9a-z]):(.*)$/.exec(line.trim());
  if (!match) return [];
  let value: unknown;
  try {
    value = JSON.parse(match[2]!);
  } catch {
    return [];
  }
  if (match[1] === "0") return text(value);
  if (match[1] === "g") return reasoning(value);
  return [];
}
