import type { UiMessages } from "../../application/ports/ui-messages.js";
import { SystemClock } from "../../infrastructure/browser/system-clock.js";
import {
  DzCitation,
  type CitationDependencies,
} from "../../presentation/components/citation/dz-citation.js";
import { resolveMessages, type Locale } from "../shared/locale.js";

export const CITATION_TAG = "dz-citation";

export interface DefineCitationOptions {
  readonly tagName?: string;
  readonly locale?: Locale;
  readonly messages?: Partial<UiMessages["citation"]>;
  readonly registry?: CustomElementRegistry;
}

/** Registra `<dz-citation>`. Idempotente. */
export function defineCitation(options: DefineCitationOptions = {}): typeof DzCitation {
  const tagName = options.tagName ?? CITATION_TAG;
  const registry = options.registry ?? customElements;
  const existing = registry.get(tagName);
  if (existing) return existing as typeof DzCitation;

  const dependencies: CitationDependencies = {
    clock: new SystemClock(),
    messages: resolveMessages("citation", options.locale, options.messages),
  };

  class RegisteredCitation extends DzCitation {
    static override dependencies = dependencies;
  }
  registry.define(tagName, RegisteredCitation);
  return RegisteredCitation;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-citation": DzCitation;
  }
}
