// API pública del paquete. Este módulo NO tiene efectos secundarios: no registra ningún elemento.
// Para registrar todos los componentes: import "@diplez/ai-web-primitives/define".

export {
  THINKING_INDICATOR_TAG,
  defineThinkingIndicator,
} from "./composition/thinking-indicator/define-thinking-indicator.js";
export type { DefineThinkingIndicatorOptions } from "./composition/thinking-indicator/define-thinking-indicator.js";

export { DzThinkingIndicator } from "./presentation/components/thinking-indicator/dz-thinking-indicator.js";

export { THINKING_PHASES } from "./domain/thinking/thinking-phase.js";
export type { ThinkingPhase } from "./domain/thinking/thinking-phase.js";

export {
  ENGLISH_THINKING_LABELS,
  SPANISH_THINKING_LABELS,
} from "./infrastructure/i18n/static-thinking-label-provider.js";
export type { ThinkingLabels } from "./infrastructure/i18n/static-thinking-label-provider.js";
