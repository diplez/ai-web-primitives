// API pública del paquete. Este módulo NO tiene efectos secundarios: no registra ningún elemento.
// Para registrar todos los componentes: import "@diplez/ai-web-primitives/define".

// Thinking indicator
export {
  THINKING_INDICATOR_TAG,
  defineThinkingIndicator,
} from "./composition/thinking-indicator/define-thinking-indicator.js";
export type { DefineThinkingIndicatorOptions } from "./composition/thinking-indicator/define-thinking-indicator.js";
export { DzThinkingIndicator } from "./presentation/components/thinking-indicator/dz-thinking-indicator.js";

// Thinking orb
export {
  THINKING_ORB_TAG,
  defineThinkingOrb,
} from "./composition/thinking-orb/define-thinking-orb.js";
export type { DefineThinkingOrbOptions } from "./composition/thinking-orb/define-thinking-orb.js";
export { DzThinkingOrb } from "./presentation/components/thinking-orb/dz-thinking-orb.js";

// Compartido
export { THINKING_PHASES } from "./domain/thinking/thinking-phase.js";
export type { ThinkingPhase } from "./domain/thinking/thinking-phase.js";
export {
  ENGLISH_THINKING_LABELS,
  SPANISH_THINKING_LABELS,
} from "./infrastructure/i18n/static-thinking-label-provider.js";
export type { ThinkingLabels } from "./infrastructure/i18n/static-thinking-label-provider.js";
