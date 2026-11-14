import { GetThinkingStatus } from "../../application/use-cases/thinking/get-thinking-status.js";
import {
  StaticThinkingLabelProvider,
  type ThinkingLabels,
} from "../../infrastructure/i18n/static-thinking-label-provider.js";
import {
  DzThinkingIndicator,
  type ThinkingIndicatorDependencies,
} from "../../presentation/components/thinking-indicator/dz-thinking-indicator.js";

import { resolveThinkingLabels, type Locale } from "../shared/locale.js";

export const THINKING_INDICATOR_TAG = "dz-thinking-indicator";

export interface DefineThinkingIndicatorOptions {
  /** Nombre de etiqueta alternativo (p. ej. para evitar colisiones). Por defecto `dz-thinking-indicator`. */
  readonly tagName?: string;
  /** Diccionario de etiquetas por fase. Por defecto, inglés. */
  readonly labels?: ThinkingLabels;
  /** Idioma de los textos por defecto (`en` o `es`). `labels` tiene prioridad. */
  readonly locale?: Locale;
  /** Registro de custom elements. Por defecto, el global `customElements`. */
  readonly registry?: CustomElementRegistry;
}

/**
 * Composition root del indicador: arma el grafo de dependencias y registra el custom element.
 * Es idempotente: si la etiqueta ya está registrada, devuelve la clase existente sin re-registrar
 * (y sin aplicar las nuevas opciones).
 */
export function defineThinkingIndicator(
  options: DefineThinkingIndicatorOptions = {},
): typeof DzThinkingIndicator {
  const tagName = options.tagName ?? THINKING_INDICATOR_TAG;
  const registry = options.registry ?? customElements;

  const existing = registry.get(tagName);
  if (existing) {
    return existing as typeof DzThinkingIndicator;
  }

  const dependencies: ThinkingIndicatorDependencies = {
    getThinkingStatus: new GetThinkingStatus(
      new StaticThinkingLabelProvider(resolveThinkingLabels(options.locale, options.labels)),
    ),
  };

  class RegisteredThinkingIndicator extends DzThinkingIndicator {
    static override dependencies = dependencies;
  }

  registry.define(tagName, RegisteredThinkingIndicator);
  return RegisteredThinkingIndicator;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-thinking-indicator": DzThinkingIndicator;
  }
}
