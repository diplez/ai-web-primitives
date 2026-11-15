// API pública del paquete. Este módulo NO tiene efectos secundarios: no registra ningún elemento.
// Para registrar todo: import "@diplez/ai-agent-ui/define" o defineAll({ locale: "es" }).

// Registro
export { defineAll } from "./composition/define-all.js";
export type { DefineAllOptions } from "./composition/define-all.js";
export type { Locale } from "./composition/shared/locale.js";

// <dz-tool-call>
export { TOOL_CALL_TAG, defineToolCall } from "./composition/tool-call/define-tool-call.js";
export type { DefineToolCallOptions } from "./composition/tool-call/define-tool-call.js";
export { DzToolCall } from "./presentation/components/tool-call/dz-tool-call.js";
export { TOOL_CALL_STATUSES } from "./domain/tool-call/tool-call.js";
export type { ToolCallStatus } from "./domain/tool-call/tool-call.js";

// <dz-agent-timeline>
export {
  AGENT_TIMELINE_TAG,
  defineAgentTimeline,
} from "./composition/agent-timeline/define-agent-timeline.js";
export type { DefineAgentTimelineOptions } from "./composition/agent-timeline/define-agent-timeline.js";
export { DzAgentTimeline } from "./presentation/components/agent-timeline/dz-agent-timeline.js";
export { AGENT_EVENT_KINDS, AGENT_EVENT_STATUSES } from "./domain/timeline/agent-event.js";
export type {
  AgentEvent,
  AgentEventInput,
  AgentEventKind,
  AgentEventStatus,
} from "./domain/timeline/agent-event.js";

// JSON incompleto (argumentos que llegan en streaming), para usar sin componentes
export { parsePartialJson } from "./domain/shared/partial-json.js";
export type { PartialJson } from "./domain/shared/partial-json.js";

// Textos
export { ENGLISH_UI_MESSAGES, SPANISH_UI_MESSAGES } from "./infrastructure/i18n/ui-messages.js";
export type { UiMessages } from "./application/ports/ui-messages.js";
