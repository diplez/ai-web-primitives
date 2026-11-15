import type { ThinkingPhase } from "../../domain/thinking/thinking-phase.js";

/** Puerto de salida: provee el texto legible de cada fase (permite i18n intercambiable). */
export interface ThinkingLabelProvider {
  getLabel(phase: ThinkingPhase): string;
}
