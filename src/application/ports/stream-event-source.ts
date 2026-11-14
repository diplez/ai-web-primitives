import type { AbortSignalLike } from "./abort-signal-like.js";
import type { StreamEvent, StreamFormat } from "../../domain/stream/stream-event.js";

export interface OpenStreamOptions {
  readonly format: StreamFormat;
  readonly signal?: AbortSignalLike | undefined;
}

/**
 * Puerto de salida: abre una fuente de streaming y la entrega como eventos normalizados.
 *
 * `source` es deliberadamente `unknown`: la aplicación no conoce los tipos del navegador.
 * El adaptador acepta `Response` (fetch), `ReadableStream` y `AsyncIterable` de texto o eventos.
 */
export interface StreamEventSource {
  open(source: unknown, options: OpenStreamOptions): AsyncIterable<StreamEvent>;
}
