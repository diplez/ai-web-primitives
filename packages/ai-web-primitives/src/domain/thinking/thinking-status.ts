import { isBusyPhase, type ThinkingPhase } from "./thinking-phase.js";

/** Estado inmutable del pensamiento del modelo en un instante dado. */
export interface ThinkingStatus {
  readonly phase: ThinkingPhase;
  readonly busy: boolean;
}

export function createThinkingStatus(phase: ThinkingPhase): ThinkingStatus {
  return Object.freeze({ phase, busy: isBusyPhase(phase) });
}
