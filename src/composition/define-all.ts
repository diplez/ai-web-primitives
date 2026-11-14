import { defineApproval } from "./approval/define-approval.js";
import { defineCitation } from "./citation/define-citation.js";
import { defineMarkdown } from "./markdown/define-markdown.js";
import { defineReasoning } from "./reasoning/define-reasoning.js";
import type { Locale } from "./shared/locale.js";
import { defineThinkingIndicator } from "./thinking-indicator/define-thinking-indicator.js";
import { defineThinkingOrb } from "./thinking-orb/define-thinking-orb.js";

export interface DefineAllOptions {
  /** Idioma de todos los textos de interfaz. Por defecto `en`. */
  readonly locale?: Locale;
  readonly registry?: CustomElementRegistry;
}

/**
 * Registra todos los componentes de una vez, en el idioma indicado.
 *
 * @example
 * import { defineAll } from "@diplez/ai-web-primitives";
 * defineAll({ locale: "es" });
 */
export function defineAll(options: DefineAllOptions = {}): void {
  defineThinkingOrb(options);
  defineThinkingIndicator(options);
  defineMarkdown(options);
  defineReasoning(options);
  defineApproval(options);
  defineCitation(options);
}
