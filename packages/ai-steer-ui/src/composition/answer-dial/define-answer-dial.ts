import type { UiMessages } from "../../application/ports/ui-messages.js";
import { AnswerDialSession } from "../../application/use-cases/answer-dial/answer-dial-session.js";
import { planMorph } from "../../application/use-cases/answer-dial/plan-morph.js";
import {
  MediaQueryMotionPreference,
  TimeoutClock,
} from "../../infrastructure/browser/browser-adapters.js";
import {
  DzAnswerDial,
  type AnswerDialDependencies,
} from "../../presentation/components/answer-dial/dz-answer-dial.js";
import { resolveMessages, type Locale } from "../shared/locale.js";

export const ANSWER_DIAL_TAG = "dz-answer-dial";

export interface DefineAnswerDialOptions {
  readonly tagName?: string;
  readonly locale?: Locale;
  readonly messages?: Partial<UiMessages["answerDial"]>;
  readonly registry?: CustomElementRegistry;
}

/** Registra `<dz-answer-dial>`. Idempotente. */
export function defineAnswerDial(options: DefineAnswerDialOptions = {}): typeof DzAnswerDial {
  const tagName = options.tagName ?? ANSWER_DIAL_TAG;
  const registry = options.registry ?? customElements;
  const existing = registry.get(tagName);
  if (existing) return existing as typeof DzAnswerDial;

  const dependencies: AnswerDialDependencies = {
    createSession: () => new AnswerDialSession(),
    planMorph,
    clock: new TimeoutClock(),
    motion: new MediaQueryMotionPreference(),
    messages: resolveMessages("answerDial", options.locale, options.messages),
  };

  class RegisteredAnswerDial extends DzAnswerDial {
    static override dependencies = dependencies;
  }
  registry.define(tagName, RegisteredAnswerDial);
  return RegisteredAnswerDial;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-answer-dial": DzAnswerDial;
  }
}
