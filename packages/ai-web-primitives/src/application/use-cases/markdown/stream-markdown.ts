import type { AbortSignalLike } from "../../ports/abort-signal-like.js";
import type { StreamFormat } from "../../../domain/stream/stream-event.js";
import type { FrameScheduler } from "../../ports/frame-scheduler.js";
import type { StreamEventSource } from "../../ports/stream-event-source.js";

export interface StreamMarkdownInput {
  /** `Response`, `ReadableStream` o `AsyncIterable<string | StreamEvent>`. */
  readonly source: unknown;
  readonly format?: StreamFormat | undefined;
  readonly signal?: AbortSignalLike | undefined;
  /** Texto previo al que se agregan los deltas (por defecto, vacío). */
  readonly initialText?: string | undefined;
  /** Recibe el texto acumulado, como mucho una vez por frame. */
  readonly onText: (text: string) => void;
  /** Recibe cada delta de razonamiento ("thinking") del modelo, si el proveedor lo envía. */
  readonly onReasoning?: ((delta: string) => void) | undefined;
}

export interface StreamMarkdownResult {
  readonly text: string;
  readonly aborted: boolean;
}

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: unknown }).name === "AbortError";

/**
 * Caso de uso: consume un stream de un modelo y acumula su texto.
 *
 * Los deltas pueden llegar cientos de veces por segundo; el texto se publica como mucho
 * una vez por frame para no re-renderizar de más. Al terminar (o al abortar) siempre se
 * publica el texto final.
 */
export class StreamMarkdown {
  constructor(
    private readonly eventSource: StreamEventSource,
    private readonly frameScheduler: FrameScheduler,
  ) {}

  async execute(input: StreamMarkdownInput): Promise<StreamMarkdownResult> {
    let text = input.initialText ?? "";
    let dirty = false;
    let aborted = false;

    const stopFrames = this.frameScheduler.start(() => {
      if (!dirty) return;
      dirty = false;
      input.onText(text);
    });

    try {
      const events = this.eventSource.open(input.source, {
        format: input.format ?? "auto",
        signal: input.signal,
      });
      for await (const event of events) {
        if (input.signal?.aborted) {
          aborted = true;
          break;
        }
        if (event.type === "text") {
          text += event.delta;
          dirty = true;
        } else {
          input.onReasoning?.(event.delta);
        }
      }
    } catch (error) {
      if (!isAbortError(error) && !input.signal?.aborted) throw error;
      aborted = true;
    } finally {
      stopFrames();
      input.onText(text);
    }

    return { text, aborted: aborted || (input.signal?.aborted ?? false) };
  }
}
