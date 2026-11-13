import { AnimateThinkingOrb } from "../../application/use-cases/orb/animate-thinking-orb.js";
import { GetThinkingStatus } from "../../application/use-cases/thinking/get-thinking-status.js";
import { AnimationFrameScheduler } from "../../infrastructure/browser/animation-frame-scheduler.js";
import { MediaQueryMotionPreference } from "../../infrastructure/browser/media-query-motion-preference.js";
import {
  StaticThinkingLabelProvider,
  type ThinkingLabels,
} from "../../infrastructure/i18n/static-thinking-label-provider.js";
import {
  DzThinkingOrb,
  type ThinkingOrbDependencies,
} from "../../presentation/components/thinking-orb/dz-thinking-orb.js";

export const THINKING_ORB_TAG = "dz-thinking-orb";

export interface DefineThinkingOrbOptions {
  /** Nombre de etiqueta alternativo. Por defecto `dz-thinking-orb`. */
  readonly tagName?: string;
  /** Diccionario de textos de estado por fase (para lectores de pantalla y `show-label`). Por defecto, inglés. */
  readonly labels?: ThinkingLabels;
  /** Registro de custom elements. Por defecto, el global `customElements`. */
  readonly registry?: CustomElementRegistry;
}

/**
 * Composition root del orbe: arma el grafo de dependencias y registra el custom element.
 * Es idempotente: si la etiqueta ya está registrada, devuelve la clase existente.
 */
export function defineThinkingOrb(options: DefineThinkingOrbOptions = {}): typeof DzThinkingOrb {
  const tagName = options.tagName ?? THINKING_ORB_TAG;
  const registry = options.registry ?? customElements;

  const existing = registry.get(tagName);
  if (existing) {
    return existing as typeof DzThinkingOrb;
  }

  const dependencies: ThinkingOrbDependencies = {
    animateThinkingOrb: new AnimateThinkingOrb(
      new AnimationFrameScheduler(),
      new MediaQueryMotionPreference(),
    ),
    getThinkingStatus: new GetThinkingStatus(new StaticThinkingLabelProvider(options.labels)),
  };

  class RegisteredThinkingOrb extends DzThinkingOrb {
    static override dependencies = dependencies;
  }

  registry.define(tagName, RegisteredThinkingOrb);
  return RegisteredThinkingOrb;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-thinking-orb": DzThinkingOrb;
  }
}
