/** Fases posibles del proceso de "pensamiento" de un modelo de lenguaje. */
export const THINKING_PHASES = ["idle", "analyzing", "searching", "generating", "done"] as const;

export type ThinkingPhase = (typeof THINKING_PHASES)[number];

/** Fase usada cuando el valor recibido no es válido ("invalid value default" de HTML). */
export const DEFAULT_THINKING_PHASE: ThinkingPhase = "idle";

export function isThinkingPhase(value: unknown): value is ThinkingPhase {
  return typeof value === "string" && (THINKING_PHASES as readonly string[]).includes(value);
}

/** Normaliza cualquier valor a una fase válida. Nunca lanza: un valor desconocido se trata como `idle`. */
export function toThinkingPhase(value: unknown): ThinkingPhase {
  return isThinkingPhase(value) ? value : DEFAULT_THINKING_PHASE;
}

/** Regla de negocio: el modelo está ocupado en toda fase que no sea `idle` ni `done`. */
export function isBusyPhase(phase: ThinkingPhase): boolean {
  return phase !== "idle" && phase !== "done";
}
