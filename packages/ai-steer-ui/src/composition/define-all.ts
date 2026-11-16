import { defineAnswerDial } from "./answer-dial/define-answer-dial.js";
import type { Locale } from "./shared/locale.js";

export interface DefineAllOptions {
  /** Idioma de todos los textos de interfaz. Por defecto `en`. */
  readonly locale?: Locale;
  readonly registry?: CustomElementRegistry;
}

/**
 * Registra todos los componentes de una vez, en el idioma indicado.
 *
 * @example
 * import { defineAll } from "@diplez/ai-steer-ui";
 * defineAll({ locale: "es" });
 */
export function defineAll(options: DefineAllOptions = {}): void {
  defineAnswerDial(options);
}
