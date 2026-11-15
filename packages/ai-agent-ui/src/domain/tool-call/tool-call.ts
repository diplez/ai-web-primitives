import { truncate } from "../shared/format.js";
import { parsePartialJson } from "../shared/partial-json.js";

/**
 * Ciclo de vida de una llamada a herramienta:
 *   pending → el modelo está escribiendo los argumentos
 *   running → la herramienta se está ejecutando
 *   success / error → terminó
 */
export const TOOL_CALL_STATUSES = ["pending", "running", "success", "error"] as const;
export type ToolCallStatus = (typeof TOOL_CALL_STATUSES)[number];

export function isToolCallStatus(value: unknown): value is ToolCallStatus {
  return typeof value === "string" && (TOOL_CALL_STATUSES as readonly string[]).includes(value);
}

/** Convierte cualquier valor en un estado válido (por defecto `pending`). */
export function toToolCallStatus(value: unknown): ToolCallStatus {
  return isToolCallStatus(value) ? value : "pending";
}

/** `true` mientras la llamada no terminó. */
export function isToolCallActive(status: ToolCallStatus): boolean {
  return status === "pending" || status === "running";
}

/** Argumentos ya interpretados, a partir de texto (posiblemente incompleto) o de un objeto. */
export interface ToolArguments {
  readonly value: unknown;
  /** `false` mientras el JSON sigue llegando. */
  readonly complete: boolean;
  /** `true` si no hay argumentos todavía. */
  readonly empty: boolean;
}

export function readToolArguments(args: unknown): ToolArguments {
  if (args === undefined || args === null || args === "") {
    return { value: undefined, complete: true, empty: true };
  }
  if (typeof args !== "string") return { value: args, complete: true, empty: false };
  const parsed = parsePartialJson(args);
  // Texto que no es JSON (p. ej. un comando de shell): se muestra tal cual.
  if (parsed === null) return { value: args, complete: true, empty: false };
  return { value: parsed.value, complete: parsed.complete, empty: false };
}

const SUMMARY_MAX_LENGTH = 60;

/**
 * Resumen de una línea de los argumentos, para la cabecera: el primer valor simple
 * (`query: "paginación"`) o el texto recortado.
 */
export function summarizeToolArguments(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string")
    return truncate(value.replace(/\s+/g, " ").trim(), SUMMARY_MAX_LENGTH);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return truncate(`[${value.length}]`, SUMMARY_MAX_LENGTH);
  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (typeof entry === "string") {
        return truncate(`${key}: "${entry.replace(/\s+/g, " ").trim()}"`, SUMMARY_MAX_LENGTH);
      }
      if (typeof entry === "number" || typeof entry === "boolean") {
        return truncate(`${key}: ${String(entry)}`, SUMMARY_MAX_LENGTH);
      }
    }
  }
  return "";
}
