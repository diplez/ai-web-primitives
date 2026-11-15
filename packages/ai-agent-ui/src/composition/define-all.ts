import { defineAgentTimeline } from "./agent-timeline/define-agent-timeline.js";
import type { Locale } from "./shared/locale.js";
import { defineToolCall } from "./tool-call/define-tool-call.js";

export interface DefineAllOptions {
  /** Idioma de todos los textos de interfaz. Por defecto `en`. */
  readonly locale?: Locale;
  readonly registry?: CustomElementRegistry;
}

/**
 * Registra todos los componentes de una vez, en el idioma indicado.
 *
 * @example
 * import { defineAll } from "@diplez/ai-agent-ui";
 * defineAll({ locale: "es" });
 */
export function defineAll(options: DefineAllOptions = {}): void {
  defineToolCall(options);
  defineAgentTimeline(options);
}
