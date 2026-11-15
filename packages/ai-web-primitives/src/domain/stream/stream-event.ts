/** Evento normalizado de un stream de un modelo de lenguaje, sin importar el proveedor. */
export type StreamEvent =
  | { readonly type: "text"; readonly delta: string }
  | { readonly type: "reasoning"; readonly delta: string };

/** Formatos de stream soportados. `auto` lo detecta por el contenido. */
export type StreamFormat = "auto" | "text" | "openai" | "anthropic" | "ai-sdk";

export const STREAM_FORMATS: readonly StreamFormat[] = [
  "auto",
  "text",
  "openai",
  "anthropic",
  "ai-sdk",
];
