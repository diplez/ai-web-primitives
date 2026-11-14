import type { UiMessages } from "../../application/ports/ui-messages.js";
import { RunApprovalCountdown } from "../../application/use-cases/approval/run-approval-countdown.js";
import { SystemClock } from "../../infrastructure/browser/system-clock.js";
import {
  DzApproval,
  type ApprovalDependencies,
} from "../../presentation/components/approval/dz-approval.js";
import { resolveMessages, type Locale } from "../shared/locale.js";

export const APPROVAL_TAG = "dz-approval";

export interface DefineApprovalOptions {
  readonly tagName?: string;
  readonly locale?: Locale;
  readonly messages?: Partial<UiMessages["approval"]>;
  readonly registry?: CustomElementRegistry;
}

/** Registra `<dz-approval>`. Idempotente. */
export function defineApproval(options: DefineApprovalOptions = {}): typeof DzApproval {
  const tagName = options.tagName ?? APPROVAL_TAG;
  const registry = options.registry ?? customElements;
  const existing = registry.get(tagName);
  if (existing) return existing as typeof DzApproval;

  const dependencies: ApprovalDependencies = {
    runApprovalCountdown: new RunApprovalCountdown(new SystemClock()),
    messages: resolveMessages("approval", options.locale, options.messages),
  };

  class RegisteredApproval extends DzApproval {
    static override dependencies = dependencies;
  }
  registry.define(tagName, RegisteredApproval);
  return RegisteredApproval;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-approval": DzApproval;
  }
}
