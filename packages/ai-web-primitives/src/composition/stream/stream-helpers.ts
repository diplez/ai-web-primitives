import type { AbortSignalLike } from "../../application/ports/abort-signal-like.js";
import type { StreamEvent, StreamFormat } from "../../domain/stream/stream-event.js";
import { FetchStreamEventSource } from "../../infrastructure/stream/fetch-stream-event-source.js";

export interface StreamHelperOptions {
  /** Formato del stream. Por defecto `auto`. */
  readonly format?: StreamFormat;
  readonly signal?: AbortSignalLike;
}

/**
 * Normaliza el stream de cualquier proveedor soportado (OpenAI, Anthropic, Vercel AI SDK o
 * texto plano) en eventos `{ type: "text" | "reasoning", delta }`.
 *
 * @example
 * for await (const event of toStreamEvents(await fetch("/api/chat"))) { … }
 */
export function toStreamEvents(
  source: unknown,
  options: StreamHelperOptions = {},
): AsyncIterable<StreamEvent> {
  return new FetchStreamEventSource().open(source, {
    format: options.format ?? "auto",
    signal: options.signal,
  });
}

/** Como `toStreamEvents`, pero entrega solo los deltas de texto de la respuesta. */
export async function* toTextStream(
  source: unknown,
  options: StreamHelperOptions = {},
): AsyncGenerator<string> {
  for await (const event of toStreamEvents(source, options)) {
    if (event.type === "text") yield event.delta;
  }
}
