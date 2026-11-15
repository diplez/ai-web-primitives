import { formatMessage, formatOffset } from "../../../domain/shared/format.js";
import {
  clampEventIndex,
  normalizeAgentEvents,
  type AgentEvent,
  type AgentEventInput,
} from "../../../domain/timeline/agent-event.js";
import type { UiMessages } from "../../ports/ui-messages.js";

export interface DescribeTimelineInput {
  readonly events: readonly AgentEventInput[];
  /** Evento seleccionado, o `null` para seguir el último (modo en vivo). */
  readonly cursor: number | null;
}

/** Posición de un evento respecto del cursor. */
export type TimelinePlacement = "past" | "current" | "future";

export interface TimelineItemDto extends AgentEvent {
  readonly index: number;
  readonly kindLabel: string;
  /** `+0:12` desde el primer evento, o `""` si no hay marcas de tiempo. */
  readonly offsetLabel: string;
  readonly placement: TimelinePlacement;
}

export interface TimelineViewDto {
  readonly items: readonly TimelineItemDto[];
  readonly currentIndex: number | null;
  readonly live: boolean;
  /** "En vivo" o "Paso 3 de 7". */
  readonly positionLabel: string;
  /** "7 eventos". */
  readonly countLabel: string;
  /** Duración total desde el primer evento con marca de tiempo. */
  readonly totalLabel: string;
}

/** Caso de uso: arma la vista de la línea de tiempo y ubica cada evento respecto del cursor. */
export class DescribeTimeline {
  constructor(private readonly messages: UiMessages["timeline"]) {}

  execute(input: DescribeTimelineInput): TimelineViewDto {
    const events = normalizeAgentEvents(input.events);
    const live = input.cursor === null;
    const currentIndex = clampEventIndex(input.cursor ?? events.length - 1, events.length);
    const origin = events.find((event) => event.at !== null)?.at ?? null;
    const offset = (at: number | null): string =>
      origin === null || at === null ? "" : formatOffset(at - origin);

    const items = events.map((event, index): TimelineItemDto => ({
      ...event,
      index,
      kindLabel: this.messages.kinds[event.kind],
      offsetLabel: offset(event.at),
      placement:
        currentIndex === null || index < currentIndex
          ? "past"
          : index === currentIndex
            ? "current"
            : "future",
    }));
    const lastStamped = [...events].reverse().find((event) => event.at !== null)?.at ?? null;

    return {
      items,
      currentIndex,
      live,
      positionLabel:
        live || currentIndex === null
          ? this.messages.live
          : formatMessage(this.messages.reviewing, {
              index: currentIndex + 1,
              total: events.length,
            }),
      countLabel:
        events.length === 1
          ? this.messages.oneEvent
          : formatMessage(this.messages.events, { count: events.length }),
      totalLabel: events.length > 1 ? offset(lastStamped).replace(/^\+/, "") : "",
    };
  }
}
