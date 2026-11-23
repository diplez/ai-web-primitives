// © 2026 Diego Lopez (diplez). All rights reserved.
import type { UiMessages } from "../../application/ports/ui-messages.js";
import { ReviewIntent } from "../../application/use-cases/intent-lens/review-intent.js";
import {
  DzIntentLens,
  type IntentLensDependencies,
} from "../../presentation/components/intent-lens/dz-intent-lens.js";
import { resolveMessages, type Locale } from "../shared/locale.js";

export const INTENT_LENS_TAG = "dz-intent-lens";

export interface DefineIntentLensOptions {
  readonly tagName?: string;
  readonly locale?: Locale;
  readonly messages?: Partial<UiMessages["intentLens"]>;
  readonly registry?: CustomElementRegistry;
}

/** Registra `<dz-intent-lens>`. Idempotente. */
export function defineIntentLens(options: DefineIntentLensOptions = {}): typeof DzIntentLens {
  const tagName = options.tagName ?? INTENT_LENS_TAG;
  const registry = options.registry ?? customElements;
  const existing = registry.get(tagName);
  if (existing) return existing as typeof DzIntentLens;

  const dependencies: IntentLensDependencies = {
    createReview: () => new ReviewIntent(),
    messages: resolveMessages("intentLens", options.locale, options.messages),
  };

  class RegisteredIntentLens extends DzIntentLens {
    static override dependencies = dependencies;
  }
  registry.define(tagName, RegisteredIntentLens);
  return RegisteredIntentLens;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-intent-lens": DzIntentLens;
  }
}
