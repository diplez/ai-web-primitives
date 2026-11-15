import type { UiMessages } from "../../application/ports/ui-messages.js";
import { DescribeToolCall } from "../../application/use-cases/tool-call/describe-tool-call.js";
import { SystemClock } from "../../infrastructure/browser/system-clock.js";
import {
  DzToolCall,
  type ToolCallDependencies,
} from "../../presentation/components/tool-call/dz-tool-call.js";
import { resolveMessages, type Locale } from "../shared/locale.js";

export const TOOL_CALL_TAG = "dz-tool-call";

export interface DefineToolCallOptions {
  readonly tagName?: string;
  readonly locale?: Locale;
  readonly messages?: Partial<UiMessages["toolCall"]>;
  readonly registry?: CustomElementRegistry;
}

/** Registra `<dz-tool-call>`. Idempotente. */
export function defineToolCall(options: DefineToolCallOptions = {}): typeof DzToolCall {
  const tagName = options.tagName ?? TOOL_CALL_TAG;
  const registry = options.registry ?? customElements;
  const existing = registry.get(tagName);
  if (existing) return existing as typeof DzToolCall;

  const dependencies: ToolCallDependencies = {
    describeToolCall: new DescribeToolCall(
      resolveMessages("toolCall", options.locale, options.messages),
    ),
    clock: new SystemClock(),
  };

  class RegisteredToolCall extends DzToolCall {
    static override dependencies = dependencies;
  }
  registry.define(tagName, RegisteredToolCall);
  return RegisteredToolCall;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-tool-call": DzToolCall;
  }
}
