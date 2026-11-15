/** Tipos de evento en la línea de tiempo de un agente. */
export const AGENT_EVENT_KINDS = [
  "message",
  "tool",
  "decision",
  "file",
  "error",
  "checkpoint",
] as const;
export type AgentEventKind = (typeof AGENT_EVENT_KINDS)[number];

export const AGENT_EVENT_STATUSES = ["running", "done", "error"] as const;
export type AgentEventStatus = (typeof AGENT_EVENT_STATUSES)[number];

/** Un evento ya normalizado. */
export interface AgentEvent {
  readonly id: string;
  readonly kind: AgentEventKind;
  readonly title: string;
  readonly detail: string;
  /** Instante del evento en ms (cualquier origen: se usa la diferencia con el primero). */
  readonly at: number | null;
  readonly status: AgentEventStatus;
}

/** Lo que acepta la API pública: un título o un objeto con lo que se tenga. */
export type AgentEventInput =
  | string
  | {
      readonly id?: string;
      readonly kind?: string;
      readonly title: string;
      readonly detail?: string;
      readonly at?: number | null;
      readonly status?: string;
    };

export function toAgentEventKind(value: unknown): AgentEventKind {
  return typeof value === "string" && (AGENT_EVENT_KINDS as readonly string[]).includes(value)
    ? (value as AgentEventKind)
    : "message";
}

export function toAgentEventStatus(value: unknown, kind: AgentEventKind): AgentEventStatus {
  if (typeof value === "string" && (AGENT_EVENT_STATUSES as readonly string[]).includes(value)) {
    return value as AgentEventStatus;
  }
  return kind === "error" ? "error" : "done";
}

/** Normaliza la entrada pública. Los eventos sin `id` reciben uno estable por posición. */
export function normalizeAgentEvents(inputs: readonly AgentEventInput[]): AgentEvent[] {
  return inputs.map((input, index) => {
    if (typeof input === "string") {
      return {
        id: `event-${index}`,
        kind: "message",
        title: input,
        detail: "",
        at: null,
        status: "done",
      };
    }
    const kind = toAgentEventKind(input.kind);
    return {
      id: input.id ?? `event-${index}`,
      kind,
      title: input.title,
      detail: input.detail ?? "",
      at: typeof input.at === "number" && Number.isFinite(input.at) ? input.at : null,
      status: toAgentEventStatus(input.status, kind),
    };
  });
}

/** Ajusta un índice al rango de la lista (o `null` si está vacía). */
export function clampEventIndex(index: number, count: number): number | null {
  if (count === 0) return null;
  if (!Number.isFinite(index)) return count - 1;
  return Math.min(count - 1, Math.max(0, Math.round(index)));
}

/** Cuántos eventos hay de cada tipo. */
export function countEventKinds(events: readonly AgentEvent[]): Record<AgentEventKind, number> {
  const counts = Object.fromEntries(AGENT_EVENT_KINDS.map((kind) => [kind, 0])) as Record<
    AgentEventKind,
    number
  >;
  for (const event of events) counts[event.kind] += 1;
  return counts;
}
