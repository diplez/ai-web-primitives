import type { UiMessages } from "../../application/ports/ui-messages.js";
import { DescribeReasoning } from "../../application/use-cases/reasoning/describe-reasoning.js";
import { SystemClock } from "../../infrastructure/browser/system-clock.js";
import {
  DzReasoning,
  type ReasoningDependencies,
} from "../../presentation/components/reasoning/dz-reasoning.js";
import { resolveMessages, type Locale } from "../shared/locale.js";

export const REASONING_TAG = "dz-reasoning";

export interface DefineReasoningOptions {
  readonly tagName?: string;
  readonly locale?: Locale;
  readonly messages?: Partial<UiMessages["reasoning"]>;
  readonly registry?: CustomElementRegistry;
}

/** Registra `<dz-reasoning>`. Idempotente. */
export function defineReasoning(options: DefineReasoningOptions = {}): typeof DzReasoning {
  const tagName = options.tagName ?? REASONING_TAG;
  const registry = options.registry ?? customElements;
  const existing = registry.get(tagName);
  if (existing) return existing as typeof DzReasoning;

  const dependencies: ReasoningDependencies = {
    describeReasoning: new DescribeReasoning(
      resolveMessages("reasoning", options.locale, options.messages),
    ),
    clock: new SystemClock(),
  };

  class RegisteredReasoning extends DzReasoning {
    static override dependencies = dependencies;
  }
  registry.define(tagName, RegisteredReasoning);
  return RegisteredReasoning;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-reasoning": DzReasoning;
  }
}
