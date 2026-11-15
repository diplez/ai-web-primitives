import { formatDuration, formatMessage } from "../../../domain/shared/format.js";
import { tokenizeJson, type JsonToken } from "../../../domain/shared/json-tokens.js";
import { parsePartialJson } from "../../../domain/shared/partial-json.js";
import {
  isToolCallActive,
  readToolArguments,
  summarizeToolArguments,
  type ToolCallStatus,
} from "../../../domain/tool-call/tool-call.js";
import type { UiMessages } from "../../ports/ui-messages.js";

export interface DescribeToolCallInput {
  readonly name: string;
  readonly status: ToolCallStatus;
  /** Argumentos: texto JSON (puede estar incompleto) u objeto. */
  readonly args: unknown;
  readonly result: unknown;
  readonly error: string;
  /** Tiempo transcurrido, o `null` si todavía no empezó. */
  readonly elapsedMs: number | null;
}

/** Contenido a mostrar: JSON resaltado o texto plano. */
export type ToolCallContent =
  | { readonly kind: "json"; readonly tokens: readonly JsonToken[] }
  | { readonly kind: "text"; readonly text: string };

export interface ToolCallViewDto {
  readonly name: string;
  readonly status: ToolCallStatus;
  readonly active: boolean;
  readonly statusLabel: string;
  readonly accessibleLabel: string;
  readonly summary: string;
  readonly durationLabel: string;
  readonly args: ToolCallContent | null;
  /** `true` mientras los argumentos siguen llegando. */
  readonly argsStreaming: boolean;
  readonly result: ToolCallContent | null;
  readonly error: string;
  /** Títulos de las secciones del panel. */
  readonly labels: { readonly arguments: string; readonly result: string; readonly error: string };
}

/** Caso de uso: arma la vista de una llamada a herramienta a partir de su estado. */
export class DescribeToolCall {
  constructor(private readonly messages: UiMessages["toolCall"]) {}

  execute(input: DescribeToolCallInput): ToolCallViewDto {
    const args = readToolArguments(input.args);
    const statusLabel = this.messages.status[input.status];
    return {
      name: input.name,
      status: input.status,
      active: isToolCallActive(input.status),
      statusLabel,
      accessibleLabel: formatMessage(this.messages.summary, {
        name: input.name,
        status: statusLabel,
      }),
      summary: summarizeToolArguments(args.value),
      durationLabel: input.elapsedMs === null ? "" : formatDuration(input.elapsedMs),
      args: args.empty ? null : toContent(args.value),
      argsStreaming: input.status === "pending" && !args.empty && !args.complete,
      result:
        input.result === undefined || input.result === null ? null : toResultContent(input.result),
      error: input.error,
      labels: {
        arguments: this.messages.arguments,
        result: this.messages.result,
        error: this.messages.error,
      },
    };
  }
}

function toContent(value: unknown): ToolCallContent {
  return typeof value === "string"
    ? { kind: "text", text: value }
    : { kind: "json", tokens: tokenizeJson(value) };
}

/** Un resultado de texto que contiene JSON se muestra resaltado; si no, como texto. */
function toResultContent(result: unknown): ToolCallContent {
  if (typeof result !== "string") return toContent(result);
  const parsed = parsePartialJson(result);
  return parsed?.complete && typeof parsed.value === "object" && parsed.value !== null
    ? { kind: "json", tokens: tokenizeJson(parsed.value) }
    : { kind: "text", text: result };
}
