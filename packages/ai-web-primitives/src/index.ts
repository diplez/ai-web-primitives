// API pública del paquete. Este módulo NO tiene efectos secundarios: no registra ningún elemento.
// Para registrar todo: import "@diplez/ai-web-primitives/define" o defineAll({ locale: "es" }).

// Registro
export { defineAll } from "./composition/define-all.js";
export type { DefineAllOptions } from "./composition/define-all.js";
export type { Locale } from "./composition/shared/locale.js";

// <dz-thinking-orb>
export {
  THINKING_ORB_TAG,
  defineThinkingOrb,
} from "./composition/thinking-orb/define-thinking-orb.js";
export type { DefineThinkingOrbOptions } from "./composition/thinking-orb/define-thinking-orb.js";
export { DzThinkingOrb } from "./presentation/components/thinking-orb/dz-thinking-orb.js";
export { ORB_VARIANTS } from "./domain/orb/orb-variant.js";
export type { OrbVariant } from "./domain/orb/orb-variant.js";

// <dz-thinking-indicator>
export {
  THINKING_INDICATOR_TAG,
  defineThinkingIndicator,
} from "./composition/thinking-indicator/define-thinking-indicator.js";
export type { DefineThinkingIndicatorOptions } from "./composition/thinking-indicator/define-thinking-indicator.js";
export { DzThinkingIndicator } from "./presentation/components/thinking-indicator/dz-thinking-indicator.js";

// <dz-markdown>
export { MARKDOWN_TAG, defineMarkdown } from "./composition/markdown/define-markdown.js";
export type { DefineMarkdownOptions } from "./composition/markdown/define-markdown.js";
export { DzMarkdown } from "./presentation/components/markdown/dz-markdown.js";
export type { MarkdownStreamOptions } from "./presentation/components/markdown/dz-markdown.js";

// <dz-reasoning>
export { REASONING_TAG, defineReasoning } from "./composition/reasoning/define-reasoning.js";
export type { DefineReasoningOptions } from "./composition/reasoning/define-reasoning.js";
export { DzReasoning } from "./presentation/components/reasoning/dz-reasoning.js";
export type {
  ReasoningStatus,
  ReasoningStep,
  ReasoningStepInput,
} from "./domain/reasoning/reasoning-step.js";

// <dz-approval>
export { APPROVAL_TAG, defineApproval } from "./composition/approval/define-approval.js";
export type { DefineApprovalOptions } from "./composition/approval/define-approval.js";
export { DzApproval } from "./presentation/components/approval/dz-approval.js";
export type {
  ApprovalDecision,
  ApprovalReason,
  ApprovalStatus,
} from "./domain/approval/approval.js";

// <dz-citation>
export { CITATION_TAG, defineCitation } from "./composition/citation/define-citation.js";
export type { DefineCitationOptions } from "./composition/citation/define-citation.js";
export { DzCitation } from "./presentation/components/citation/dz-citation.js";

// Streams de modelos (para usar sin componentes)
export { toStreamEvents, toTextStream } from "./composition/stream/stream-helpers.js";
export type { StreamEvent, StreamFormat } from "./domain/stream/stream-event.js";

// Markdown sin componente (árbol seguro, sin HTML)
export { parseMarkdown } from "./domain/markdown/parse-markdown.js";
export type { ParseMarkdownOptions } from "./domain/markdown/parse-markdown.js";
export type { MarkdownBlock, MarkdownInline } from "./domain/markdown/markdown-ast.js";

// Fases y textos
export { THINKING_PHASES } from "./domain/thinking/thinking-phase.js";
export type { ThinkingPhase } from "./domain/thinking/thinking-phase.js";
export {
  ENGLISH_THINKING_LABELS,
  SPANISH_THINKING_LABELS,
} from "./infrastructure/i18n/static-thinking-label-provider.js";
export type { ThinkingLabels } from "./infrastructure/i18n/static-thinking-label-provider.js";
export { ENGLISH_UI_MESSAGES, SPANISH_UI_MESSAGES } from "./infrastructure/i18n/ui-messages.js";
export type { UiMessages } from "./application/ports/ui-messages.js";
