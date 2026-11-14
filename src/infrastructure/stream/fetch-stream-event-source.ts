import type { AbortSignalLike } from "../../application/ports/abort-signal-like.js";
import type {
  OpenStreamOptions,
  StreamEventSource,
} from "../../application/ports/stream-event-source.js";
import {
  eventsFromDataStreamLine,
  eventsFromSseMessage,
  isDataStreamLine,
} from "../../domain/stream/provider-formats.js";
import { SseDecoder } from "../../domain/stream/sse-decoder.js";
import type { StreamEvent, StreamFormat } from "../../domain/stream/stream-event.js";

type ByteOrTextStream = ReadableStream<Uint8Array | string>;

interface ResponseLike {
  readonly body: ByteOrTextStream | null;
  readonly headers?: { get(name: string): string | null };
}

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function";

const isReadableStream = (value: unknown): value is ByteOrTextStream =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { getReader?: unknown }).getReader === "function";

const isResponseLike = (value: unknown): value is ResponseLike =>
  typeof value === "object" && value !== null && "body" in value && !isReadableStream(value);

const isStreamEvent = (value: unknown): value is StreamEvent =>
  typeof value === "object" &&
  value !== null &&
  ((value as StreamEvent).type === "text" || (value as StreamEvent).type === "reasoning") &&
  typeof (value as StreamEvent).delta === "string";

/** Lee un ReadableStream como texto, chunk a chunk. */
async function* readText(
  stream: ByteOrTextStream,
  signal?: AbortSignalLike,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const onAbort = () => void reader.cancel().catch(() => {});
  signal?.addEventListener?.("abort", onAbort, { once: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield typeof value === "string" ? value : decoder.decode(value, { stream: true });
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    signal?.removeEventListener?.("abort", onAbort);
    reader.releaseLock();
  }
}

type Protocol = "sse" | "data-stream" | "text";

function chooseProtocol(format: StreamFormat, contentType: string, firstChunk: string): Protocol {
  if (format === "text") return "text";
  if (contentType.includes("text/event-stream")) return "sse";
  if (/^(data|event|id|retry):|^:/m.test(firstChunk.trimStart().slice(0, 64))) return "sse";
  if ((format === "auto" || format === "ai-sdk") && isDataStreamLine(firstChunk.trimStart())) {
    return "data-stream";
  }
  if (format === "openai" || format === "anthropic") return "sse";
  return "text";
}

/**
 * Adaptador de `StreamEventSource` para el navegador (y Node 18+).
 *
 * - `Response` de `fetch` o `ReadableStream`: detecta SSE, el "data stream" de AI SDK v4
 *   o texto plano, y normaliza los eventos de OpenAI, Anthropic y AI SDK.
 * - `AsyncIterable<string | StreamEvent>`: se usa tal cual (útil con SDKs oficiales).
 */
export class FetchStreamEventSource implements StreamEventSource {
  async *open(source: unknown, options: OpenStreamOptions): AsyncGenerator<StreamEvent> {
    // Un ReadableStream también es AsyncIterable (de bytes): se distingue primero.
    if (isAsyncIterable(source) && !isReadableStream(source)) {
      for await (const item of source) {
        if (options.signal?.aborted) return;
        if (typeof item === "string") {
          if (item) yield { type: "text", delta: item };
        } else if (isStreamEvent(item)) {
          yield item;
        }
      }
      return;
    }

    let stream: ByteOrTextStream | null = null;
    let contentType = "";
    if (isReadableStream(source)) {
      stream = source;
    } else if (isResponseLike(source)) {
      stream = source.body;
      contentType = source.headers?.get("content-type")?.toLowerCase() ?? "";
    }
    if (!stream) {
      throw new TypeError(
        "Unsupported stream source. Pass a fetch Response, a ReadableStream or an AsyncIterable.",
      );
    }

    let protocol: Protocol | null = null;
    const sse = new SseDecoder();
    let pendingLine = "";

    for await (const chunk of readText(stream, options.signal)) {
      protocol ??= chooseProtocol(options.format, contentType, chunk);

      if (protocol === "text") {
        if (chunk) yield { type: "text", delta: chunk };
      } else if (protocol === "sse") {
        for (const message of sse.push(chunk)) yield* eventsFromSseMessage(message, options.format);
      } else {
        const lines = (pendingLine + chunk).split("\n");
        pendingLine = lines.pop() ?? "";
        for (const line of lines) yield* eventsFromDataStreamLine(line);
      }
    }

    if (protocol === "sse") {
      for (const message of sse.flush()) yield* eventsFromSseMessage(message, options.format);
    } else if (protocol === "data-stream" && pendingLine) {
      yield* eventsFromDataStreamLine(pendingLine);
    }
  }
}
