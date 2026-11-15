import type { UiMessages } from "../../application/ports/ui-messages.js";
import { DescribeTimeline } from "../../application/use-cases/timeline/describe-timeline.js";
import { ReplayTimeline } from "../../application/use-cases/timeline/replay-timeline.js";
import { SystemClock } from "../../infrastructure/browser/system-clock.js";
import {
  DzAgentTimeline,
  type AgentTimelineDependencies,
} from "../../presentation/components/agent-timeline/dz-agent-timeline.js";
import { resolveMessages, type Locale } from "../shared/locale.js";

export const AGENT_TIMELINE_TAG = "dz-agent-timeline";

export interface DefineAgentTimelineOptions {
  readonly tagName?: string;
  readonly locale?: Locale;
  readonly messages?: Partial<UiMessages["timeline"]>;
  readonly registry?: CustomElementRegistry;
}

/** Registra `<dz-agent-timeline>`. Idempotente. */
export function defineAgentTimeline(
  options: DefineAgentTimelineOptions = {},
): typeof DzAgentTimeline {
  const tagName = options.tagName ?? AGENT_TIMELINE_TAG;
  const registry = options.registry ?? customElements;
  const existing = registry.get(tagName);
  if (existing) return existing as typeof DzAgentTimeline;

  const clock = new SystemClock();
  const messages = resolveMessages("timeline", options.locale, options.messages);
  const dependencies: AgentTimelineDependencies = {
    describeTimeline: new DescribeTimeline(messages),
    replayTimeline: new ReplayTimeline(clock),
    clock,
    messages,
  };

  class RegisteredAgentTimeline extends DzAgentTimeline {
    static override dependencies = dependencies;
  }
  registry.define(tagName, RegisteredAgentTimeline);
  return RegisteredAgentTimeline;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-agent-timeline": DzAgentTimeline;
  }
}
