// API pública del paquete. Este módulo NO tiene efectos secundarios: no registra ningún elemento.
// Para registrar todo: import "@diplez/ai-steer-ui/define" o defineAll({ locale: "es" }).

// Registro
export { defineAll } from "./composition/define-all.js";
export type { DefineAllOptions } from "./composition/define-all.js";
export type { Locale } from "./composition/shared/locale.js";

// <dz-answer-dial>
export { ANSWER_DIAL_TAG, defineAnswerDial } from "./composition/answer-dial/define-answer-dial.js";
export type { DefineAnswerDialOptions } from "./composition/answer-dial/define-answer-dial.js";
export { DzAnswerDial } from "./presentation/components/answer-dial/dz-answer-dial.js";
export type {
  RewriteFunction,
  RewriteRequest,
} from "./presentation/components/answer-dial/dz-answer-dial.js";
export { DIAL_PRESETS } from "./domain/dial/dial.js";
export type { DialInput, DialPreset, DialValues } from "./domain/dial/dial.js";

// <dz-intent-lens>
export { INTENT_LENS_TAG, defineIntentLens } from "./composition/intent-lens/define-intent-lens.js";
export type { DefineIntentLensOptions } from "./composition/intent-lens/define-intent-lens.js";
export { DzIntentLens } from "./presentation/components/intent-lens/dz-intent-lens.js";
export type { IntentLensStatus } from "./presentation/components/intent-lens/dz-intent-lens.js";
export type { IntentReviewResult } from "./application/use-cases/intent-lens/review-intent.js";
export type {
  IntentChange,
  IntentEdit,
  IntentInput,
  IntentItemKind,
} from "./domain/intent/intent.js";
export {
  INTENT_REQUEST_PROMPT,
  buildIntentInstruction,
  parseIntentResponse,
} from "./domain/intent/intent-prompts.js";

// Sin componente: instrucción para el modelo y diff palabra por palabra
export { buildRewriteInstruction } from "./domain/dial/rewrite-instruction.js";
export { diffWords } from "./domain/text/word-diff.js";
export type { DiffOp, DiffToken } from "./domain/text/word-diff.js";

// Textos
export { ENGLISH_UI_MESSAGES, SPANISH_UI_MESSAGES } from "./infrastructure/i18n/ui-messages.js";
export type { UiMessages } from "./application/ports/ui-messages.js";
