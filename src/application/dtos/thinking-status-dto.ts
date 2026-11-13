import type { ThinkingPhase } from "../../domain/thinking/thinking-phase.js";

/** Lo que la capa de presentación necesita para renderizar un indicador de pensamiento. */
export interface ThinkingStatusDto {
  readonly phase: ThinkingPhase;
  readonly busy: boolean;
  readonly label: string;
}
