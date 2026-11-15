import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { property, query, state } from "lit/decorators.js";
import type {
  DescribeTimeline,
  TimelineItemDto,
} from "../../../application/use-cases/timeline/describe-timeline.js";
import type { ReplayTimeline } from "../../../application/use-cases/timeline/replay-timeline.js";
import type { UiMessages } from "../../../application/ports/ui-messages.js";
import type { Clock } from "../../../application/ports/clock.js";
import {
  clampEventIndex,
  normalizeAgentEvents,
  type AgentEvent,
  type AgentEventInput,
  type AgentEventKind,
  type AgentEventStatus,
} from "../../../domain/timeline/agent-event.js";
import { themeTokens } from "../../theme/theme-tokens.js";
import { EVENT_ICONS } from "./event-icons.js";

export interface AgentTimelineDependencies {
  readonly describeTimeline: Pick<DescribeTimeline, "execute">;
  readonly replayTimeline: Pick<ReplayTimeline, "execute">;
  readonly clock: Clock;
  readonly messages: UiMessages["timeline"];
}

/** Acepta un array JSON en el atributo `events`. */
const eventsConverter = {
  fromAttribute(value: string | null): AgentEventInput[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as AgentEventInput[]) : [];
    } catch {
      return [];
    }
  },
};

/**
 * La "caja negra" de un agente: una línea de tiempo con todo lo que hizo (mensajes,
 * herramientas, decisiones, archivos, errores). Se puede **rebobinar** arrastrando el control
 * para revisar cada paso, **repetir** la ejecución como un video y, con `forkable`,
 * **bifurcar** desde cualquier paso para que el agente pruebe otro camino.
 *
 * En modo "en vivo" sigue al último evento; al mover el control queda fijo en el paso elegido
 * hasta volver a en vivo.
 *
 * @tag dz-agent-timeline
 * @fires dz-select - Se eligió un evento. `detail: { event, index, live }`.
 * @fires dz-fork - Se pidió bifurcar desde un evento. `detail: { event, index }`.
 * @csspart header - La barra superior con el estado y los botones.
 * @csspart scrubber - El control para recorrer la línea de tiempo.
 * @csspart list - La lista de eventos.
 * @csspart event - Cada evento (con `data-kind`, `data-status` y `data-placement`).
 * @csspart fork-button - El botón "Bifurcar desde aquí".
 * @cssprop --dz-accent - Color del cursor y del evento actual.
 * @cssprop --dz-timeline-max-height - Alto máximo de la lista antes de hacer scroll (320px).
 */
export class DzAgentTimeline extends LitElement {
  static dependencies?: AgentTimelineDependencies;

  static override styles = [
    themeTokens,
    css`
      :host {
        display: block;
        color: var(--_text);
      }
      .frame {
        border: 1px solid var(--_border);
        border-radius: var(--_radius);
        background: var(--_surface);
        overflow: hidden;
      }
      header {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px 12px;
        padding: 10px 14px;
        font-size: 0.88em;
      }
      .position {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-weight: 600;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--_muted);
      }
      .live .dot {
        background: var(--_danger);
        animation: pulse 1.4s ease-in-out infinite;
      }
      @keyframes pulse {
        50% {
          opacity: 0.35;
        }
      }
      .stats {
        color: var(--_muted);
        font-variant-numeric: tabular-nums;
      }
      .actions {
        margin-left: auto;
        display: flex;
        gap: 6px;
      }
      button {
        font: inherit;
        font-size: 0.92em;
        color: var(--_text);
        background: var(--_surface-raised);
        border: 1px solid var(--_border);
        border-radius: calc(var(--_radius) - 4px);
        padding: 4px 10px;
        cursor: pointer;
      }
      button:hover {
        border-color: var(--_accent);
      }
      .scrubber {
        position: relative;
        margin: 0 14px 10px;
        height: 22px;
      }
      .track {
        position: absolute;
        inset: 10px 0 auto;
        height: 2px;
        background: var(--_border);
        border-radius: 2px;
      }
      .progress {
        position: absolute;
        inset: 10px auto auto 0;
        height: 2px;
        background: var(--_accent);
        border-radius: 2px;
        transition: width 0.25s ease;
      }
      .tick {
        position: absolute;
        top: 7px;
        width: 8px;
        height: 8px;
        margin-left: -4px;
        border-radius: 50%;
        background: var(--_surface);
        border: 2px solid var(--_muted);
        box-sizing: border-box;
        pointer-events: none;
      }
      .tick[data-kind="tool"] {
        border-color: var(--_accent);
      }
      .tick[data-kind="error"] {
        border-color: var(--_danger);
      }
      .tick[data-kind="checkpoint"],
      .tick[data-kind="decision"] {
        border-color: var(--_warning);
      }
      .tick[data-kind="file"] {
        border-color: var(--_success);
      }
      .tick[data-placement="future"] {
        opacity: 0.4;
      }
      input[type="range"] {
        position: absolute;
        inset: 0;
        width: 100%;
        margin: 0;
        background: transparent;
        appearance: none;
        -webkit-appearance: none;
        cursor: pointer;
      }
      input[type="range"]::-webkit-slider-runnable-track {
        background: transparent;
        height: 22px;
      }
      input[type="range"]::-moz-range-track {
        background: transparent;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        margin-top: 4px;
        border-radius: 50%;
        background: var(--_accent);
        border: 2px solid var(--_surface);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--_accent) 30%, transparent);
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--_accent);
        border: 2px solid var(--_surface);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--_accent) 30%, transparent);
      }
      ol {
        list-style: none;
        margin: 0;
        padding: 4px 8px 8px;
        border-top: 1px solid var(--_border);
        max-height: var(--dz-timeline-max-height, 320px);
        overflow: auto;
      }
      li {
        display: grid;
        grid-template-columns: 26px minmax(0, 1fr) auto;
        gap: 4px 10px;
        align-items: start;
        padding: 7px 6px;
        border-radius: calc(var(--_radius) - 4px);
        cursor: pointer;
        transition: opacity 0.2s ease;
      }
      li:hover {
        background: var(--_surface-raised);
      }
      li[data-placement="future"] {
        opacity: 0.38;
      }
      li[data-placement="current"] {
        background: color-mix(in srgb, var(--_accent) 12%, transparent);
        box-shadow: inset 2px 0 0 var(--_accent);
      }
      .icon {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--_surface-raised);
        color: var(--_muted);
      }
      .icon svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.4;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      [data-kind="tool"] .icon {
        color: var(--_accent);
      }
      [data-kind="error"] .icon,
      [data-status="error"] .icon {
        color: var(--_danger);
      }
      [data-kind="decision"] .icon,
      [data-kind="checkpoint"] .icon {
        color: var(--_warning);
      }
      [data-kind="file"] .icon {
        color: var(--_success);
      }
      [data-status="running"] .icon {
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--_accent) 45%, transparent);
        animation: pulse 1.2s ease-in-out infinite;
      }
      .title {
        font-weight: 500;
        line-height: 1.35;
        padding-top: 3px;
      }
      .kind {
        color: var(--_muted);
        font-size: 0.78em;
        margin-right: 6px;
      }
      .offset {
        color: var(--_muted);
        font-family: var(--_font-mono);
        font-size: 0.78em;
        padding-top: 5px;
        font-variant-numeric: tabular-nums;
      }
      .detail {
        grid-column: 2 / 4;
        color: var(--_muted);
        font-size: 0.88em;
        white-space: pre-wrap;
      }
      .fork {
        grid-column: 2 / 4;
        justify-self: start;
        color: var(--_accent);
        border-color: color-mix(in srgb, var(--_accent) 45%, var(--_border));
      }
      .empty {
        padding: 16px 14px;
        border-top: 1px solid var(--_border);
        color: var(--_muted);
        font-size: 0.9em;
      }
    `,
  ];

  /** Eventos: strings u objetos `{ id?, kind?, title, detail?, at?, status? }`. */
  @property({ attribute: "events", converter: eventsConverter }) events: AgentEventInput[] = [];

  /** Muestra "Bifurcar desde aquí" en el evento elegido y emite `dz-fork`. */
  @property({ type: Boolean, reflect: true }) forkable = false;

  /** Milisegundos entre eventos al repetir la ejecución. */
  @property({ type: Number, attribute: "replay-interval" }) replayInterval = 700;

  /** Evento elegido, o `null` para seguir el último (en vivo). */
  @state() private cursor: number | null = null;
  @state() private replaying = false;

  @query("ol") private list?: HTMLOListElement;

  private stopReplay: (() => void) | null = null;
  private nextId = 0;

  // ---- API imperativa -----------------------------------------------------------------------

  /** `true` si sigue al último evento. */
  get live(): boolean {
    return this.cursor === null;
  }

  /** Agrega un evento (con la hora actual si no trae `at`) y devuelve su id. */
  addEvent(input: AgentEventInput): string {
    const base = typeof input === "string" ? { title: input } : input;
    const id = base.id ?? `dz-event-${this.nextId++}`;
    this.events = [
      ...this.events,
      { ...base, id, at: base.at ?? this.getDependencies().clock.now() },
    ];
    return id;
  }

  /** Actualiza un evento existente. */
  updateEvent(
    id: string,
    patch: Partial<{
      title: string;
      detail: string;
      kind: AgentEventKind;
      status: AgentEventStatus;
    }>,
  ): void {
    this.events = this.normalized().map((event) =>
      event.id === id ? { ...event, ...patch } : event,
    );
  }

  /** Elige un evento por índice (sale del modo en vivo). */
  select(index: number): void {
    this.cancelReplay();
    this.moveTo(index);
  }

  /** Vuelve a seguir el último evento. */
  goLive(): void {
    this.cancelReplay();
    this.cursor = null;
    this.emitSelect();
  }

  /** Repite la ejecución desde el evento elegido (o desde el principio). */
  replay(): void {
    const { replayTimeline } = this.getDependencies();
    this.cancelReplay();
    const count = this.events.length;
    this.replaying = true;
    this.stopReplay = replayTimeline.execute({
      from: this.cursor ?? count - 1,
      count,
      intervalMs: this.replayInterval,
      onStep: (index) => this.moveTo(index),
      onEnd: () => {
        this.stopReplay = null;
        this.replaying = false;
        this.cursor = null;
      },
    });
  }

  /** Detiene la repetición en el paso actual. */
  pause(): void {
    this.cancelReplay();
  }

  /** Vacía la línea de tiempo. */
  clear(): void {
    this.cancelReplay();
    this.events = [];
    this.cursor = null;
  }

  // ---- Ciclo de vida -------------------------------------------------------------------------

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cancelReplay();
  }

  protected override updated(changed: PropertyValues<this>): void {
    // En vivo, la lista se desplaza sola para mostrar el último evento. Solo se mueve la lista:
    // `scrollIntoView` también desplazaría la página que contiene al componente.
    if (changed.has("events") && this.live && this.list) {
      this.list.scrollTop = this.list.scrollHeight;
    }
  }

  protected override render() {
    const { describeTimeline, messages } = this.getDependencies();
    const view = describeTimeline.execute({ events: this.events, cursor: this.cursor });
    const count = view.items.length;

    return html`<div class="frame">
      <header part="header">
        <span class="position ${view.live ? "live" : ""}" role="status" aria-live="polite">
          <span class="dot" aria-hidden="true"></span>${view.positionLabel}
        </span>
        <span class="stats"
          >${view.countLabel}${view.totalLabel ? ` · ${view.totalLabel}` : ""}</span
        >
        <span class="actions">
          ${
            count > 1
              ? html`<button type="button" @click=${this.replaying ? this.pause : this.replay}>
                  ${this.replaying ? messages.pause : messages.replay}
                </button>`
              : nothing
          }
          ${
            view.live
              ? nothing
              : html`<button type="button" @click=${this.goLive}>${messages.backToLive}</button>`
          }
        </span>
      </header>
      ${
        count === 0
          ? html`<div class="empty">${messages.empty}</div>`
          : html`${this.renderScrubber(view.items, view.currentIndex, messages.scrubber)}
              <ol part="list">
                ${view.items.map((item) => this.renderItem(item, messages.fork))}
              </ol>`
      }
    </div>`;
  }

  private renderScrubber(
    items: readonly TimelineItemDto[],
    currentIndex: number | null,
    label: string,
  ) {
    const count = items.length;
    const position = (index: number): string =>
      count > 1 ? `calc(7px + (100% - 14px) * ${index / (count - 1)})` : "50%";
    const current = currentIndex === null ? null : items[currentIndex];
    return html`<div class="scrubber" part="scrubber">
      <div class="track"></div>
      <div class="progress" style="width: ${position(currentIndex ?? count - 1)}"></div>
      ${items.map(
        (item) =>
          html`<span
            class="tick"
            data-kind=${item.kind}
            data-placement=${item.placement}
            style="left: ${position(item.index)}"
          ></span>`,
      )}
      <input
        type="range"
        min="0"
        max=${Math.max(0, count - 1)}
        step="1"
        .value=${String(currentIndex ?? count - 1)}
        aria-label=${label}
        aria-valuetext=${current ? `${current.kindLabel}: ${current.title}` : ""}
        ?disabled=${count < 2}
        @input=${this.onScrub}
      />
    </div>`;
  }

  private renderItem(item: TimelineItemDto, forkLabel: string) {
    const current = item.placement === "current";
    return html`<li
      part="event"
      data-kind=${item.kind}
      data-status=${item.status}
      data-placement=${item.placement}
      aria-current=${current ? "step" : "false"}
      @click=${() => this.select(item.index)}
    >
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">${EVENT_ICONS[item.kind]}</svg>
      </span>
      <span class="title"><span class="kind">${item.kindLabel}</span>${item.title}</span>
      <span class="offset">${item.offsetLabel}</span>
      ${item.detail && current ? html`<span class="detail">${item.detail}</span>` : nothing}
      ${
        current && this.forkable
          ? html`<button
              type="button"
              class="fork"
              part="fork-button"
              @click=${(event: Event) => this.onFork(event, item)}
            >
              ⑂ ${forkLabel}
            </button>`
          : nothing
      }
    </li>`;
  }

  private onScrub(event: Event): void {
    this.select(Number((event.target as HTMLInputElement).value));
  }

  private onFork(event: Event, item: TimelineItemDto): void {
    event.stopPropagation();
    this.cancelReplay();
    this.dispatchEvent(
      new CustomEvent("dz-fork", {
        detail: { event: this.toPublicEvent(item), index: item.index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private moveTo(index: number): void {
    const target = clampEventIndex(index, this.events.length);
    if (target === null || target === this.cursor) return;
    this.cursor = target;
    this.emitSelect();
  }

  private emitSelect(): void {
    const events = this.normalized();
    const index = this.cursor ?? events.length - 1;
    const event = events[index];
    if (!event) return;
    this.dispatchEvent(
      new CustomEvent("dz-select", {
        detail: { event, index, live: this.live },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private cancelReplay(): void {
    this.stopReplay?.();
    this.stopReplay = null;
    this.replaying = false;
  }

  private toPublicEvent(item: TimelineItemDto): AgentEvent {
    const { id, kind, title, detail, at, status } = item;
    return { id, kind, title, detail, at, status };
  }

  private normalized(): AgentEvent[] {
    return normalizeAgentEvents(this.events);
  }

  private getDependencies(): AgentTimelineDependencies {
    const { dependencies } = this.constructor as typeof DzAgentTimeline;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineAgentTimeline().`,
      );
    }
    return dependencies;
  }
}
