import type { ThinkingLabelProvider } from "../../application/ports/thinking-label-provider.js";
import type { ThinkingPhase } from "../../domain/thinking/thinking-phase.js";

export type ThinkingLabels = Readonly<Record<ThinkingPhase, string>>;

export const ENGLISH_THINKING_LABELS: ThinkingLabels = Object.freeze({
  idle: "Idle",
  analyzing: "Analyzing context…",
  searching: "Searching sources…",
  generating: "Generating response…",
  done: "Done",
});

export const SPANISH_THINKING_LABELS: ThinkingLabels = Object.freeze({
  idle: "En espera",
  analyzing: "Analizando contexto…",
  searching: "Buscando fuentes…",
  generating: "Generando respuesta…",
  done: "Listo",
});

/** Adaptador de `ThinkingLabelProvider` basado en un diccionario fijo de etiquetas. */
export class StaticThinkingLabelProvider implements ThinkingLabelProvider {
  constructor(private readonly labels: ThinkingLabels = ENGLISH_THINKING_LABELS) {}

  getLabel(phase: ThinkingPhase): string {
    return this.labels[phase];
  }
}
