import type { AgentEventKind } from "../../domain/timeline/agent-event.js";
import type { ToolCallStatus } from "../../domain/tool-call/tool-call.js";

/**
 * Textos visibles de los componentes. Los marcadores `{nombre}` se reemplazan al mostrar.
 * Se pueden sobrescribir por componente en cada `define*()`.
 */
export interface UiMessages {
  readonly toolCall: {
    readonly status: Readonly<Record<ToolCallStatus, string>>;
    readonly arguments: string;
    readonly result: string;
    readonly error: string;
    /** Texto para lectores de pantalla en la cabecera: "{name}, {status}". */
    readonly summary: string;
  };
  readonly timeline: {
    readonly live: string;
    /** "Paso {index} de {total}". */
    readonly reviewing: string;
    /** "{count} eventos" (con `{count}` ≠ 1). */
    readonly events: string;
    readonly oneEvent: string;
    readonly empty: string;
    readonly replay: string;
    readonly pause: string;
    readonly backToLive: string;
    readonly fork: string;
    readonly scrubber: string;
    readonly kinds: Readonly<Record<AgentEventKind, string>>;
  };
}
