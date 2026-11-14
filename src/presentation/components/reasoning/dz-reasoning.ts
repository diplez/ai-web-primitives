import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import type { Clock } from "../../../application/ports/clock.js";
import type {
  DescribeReasoning,
  ReasoningViewDto,
} from "../../../application/use-cases/reasoning/describe-reasoning.js";
import {
  elapsedSeconds,
  normalizeReasoningSteps,
  reasoningProgress,
  type ReasoningStatus,
  type ReasoningStep,
  type ReasoningStepInput,
} from "../../../domain/reasoning/reasoning-step.js";
import { themeTokens } from "../../theme/theme-tokens.js";

export interface ReasoningDependencies {
  readonly describeReasoning: Pick<DescribeReasoning, "execute">;
  readonly clock: Clock;
}

/** Acepta un array JSON en el atributo `steps`: `steps='["Leer","Buscar"]'`. */
const stepsConverter = {
  fromAttribute(value: string | null): ReasoningStepInput[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as ReasoningStepInput[]) : [];
    } catch {
      return [];
    }
  },
};

/**
 * Panel plegable con el razonamiento de un agente, paso a paso y en vivo:
 * "Pensando… 2 de 5 pasos" mientras trabaja, "Pensó durante 12 s" al terminar.
 *
 * Se alimenta con la propiedad `steps` (array de strings u objetos `{ title, status, detail }`)
 * o con los métodos `addStep`, `updateStep`, `appendDetail` y `finish`.
 *
 * @tag dz-reasoning
 * @fires dz-toggle - Se abrió o cerró el panel. `detail: { open }`.
 * @csspart container - El `<details>` del panel.
 * @csspart summary - La cabecera clicable.
 * @csspart steps - La lista de pasos.
 * @csspart step - Cada paso (con `data-status`).
 * @csspart detail - El detalle de un paso.
 * @cssprop --dz-accent - Color del paso en curso.
 * @cssprop --dz-success - Color de los pasos completados.
 * @cssprop --dz-danger - Color de los pasos con error.
 */
export class DzReasoning extends LitElement {
  static dependencies?: ReasoningDependencies;

  static override styles = [
    themeTokens,
    css`
      :host {
        display: block;
        color: var(--_text);
      }
      details {
        border: 1px solid var(--_border);
        border-radius: var(--_radius);
        background: var(--_surface);
      }
      summary {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        cursor: pointer;
        list-style: none;
        border-radius: var(--_radius);
      }
      summary::-webkit-details-marker {
        display: none;
      }
      .headline {
        font-weight: 600;
      }
      .progress {
        color: var(--_muted);
        font-size: 0.875em;
        font-variant-numeric: tabular-nums;
      }
      .chevron {
        margin-left: auto;
        width: 8px;
        height: 8px;
        border-right: 2px solid var(--_muted);
        border-bottom: 2px solid var(--_muted);
        transform: rotate(45deg) translateY(-2px);
        transition: transform 0.2s ease;
      }
      details[open] .chevron {
        transform: rotate(225deg) translateY(-2px);
      }
      .pulse {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex: none;
        background: var(--_muted);
      }
      .pulse[data-state="running"] {
        background: var(--_accent);
        animation: pulse 1.2s ease-in-out infinite;
      }
      .pulse[data-state="done"] {
        background: var(--_success);
      }
      .pulse[data-state="error"] {
        background: var(--_danger);
      }
      @keyframes pulse {
        50% {
          transform: scale(0.6);
          opacity: 0.5;
        }
      }
      ol {
        list-style: none;
        margin: 0;
        padding: 4px 14px 14px;
        display: grid;
        gap: 2px;
      }
      li {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        gap: 10px;
        position: relative;
        padding: 6px 0;
      }
      li:not(:last-child)::after {
        content: "";
        position: absolute;
        left: 8px;
        top: 26px;
        bottom: -4px;
        width: 2px;
        background: var(--_border);
      }
      .marker {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        box-sizing: border-box;
        border: 2px solid var(--_border);
        display: grid;
        place-items: center;
        margin-top: 2px;
        background: var(--_surface);
      }
      [data-status="running"] .marker {
        border-color: color-mix(in srgb, var(--_accent) 25%, transparent);
        border-top-color: var(--_accent);
        animation: spin 0.8s linear infinite;
      }
      [data-status="done"] .marker {
        border-color: var(--_success);
        background: var(--_success);
      }
      [data-status="done"] .marker::after {
        content: "";
        width: 5px;
        height: 9px;
        border: solid var(--_surface);
        border-width: 0 2px 2px 0;
        transform: translateY(-1px) rotate(45deg);
      }
      [data-status="error"] .marker {
        border-color: var(--_danger);
        background: var(--_danger);
      }
      [data-status="error"] .marker::after {
        content: "!";
        color: var(--_surface);
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .title {
        font-weight: 500;
      }
      [data-status="pending"] .title {
        color: var(--_muted);
      }
      .detail {
        margin-top: 2px;
        color: var(--_muted);
        font-size: 0.9em;
        white-space: pre-wrap;
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ];

  /** Pasos: strings u objetos `{ id?, title, status?: "pending"|"running"|"done"|"error", detail? }`. */
  @property({ attribute: "steps", converter: stepsConverter }) steps: ReasoningStepInput[] = [];

  /** Panel expandido. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Titular fijo que reemplaza al automático ("Pensando…", "Pensó durante 4 s"). */
  @property() heading?: string;

  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private stopTicking: (() => void) | null = null;
  private nextId = 0;

  // ---- API imperativa -----------------------------------------------------------------------

  /** Agrega un paso (por defecto, en curso) y devuelve su id. */
  addStep(title: string, options: { status?: ReasoningStatus; detail?: string } = {}): string {
    const id = `dz-step-${this.nextId++}`;
    this.steps = [
      ...this.steps,
      { id, title, status: options.status ?? "running", detail: options.detail ?? "" },
    ];
    return id;
  }

  /** Actualiza un paso existente. */
  updateStep(id: string, patch: Partial<Omit<ReasoningStep, "id">>): void {
    this.steps = this.normalized().map((step) => (step.id === id ? { ...step, ...patch } : step));
  }

  /** Agrega texto al detalle de un paso (p. ej. el "thinking" que llega en streaming). */
  appendDetail(id: string, delta: string): void {
    this.steps = this.normalized().map((step) =>
      step.id === id ? { ...step, detail: step.detail + delta } : step,
    );
  }

  /** Marca como terminados todos los pasos en curso o pendientes. */
  finish(): void {
    this.steps = this.normalized().map((step) =>
      step.status === "running" || step.status === "pending" ? { ...step, status: "done" } : step,
    );
  }

  /** Vacía el panel y reinicia el cronómetro. */
  reset(): void {
    this.steps = [];
  }

  // ---- Ciclo de vida -------------------------------------------------------------------------

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopTicking?.();
    this.stopTicking = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.requestUpdate();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has("steps")) return;
    const { clock } = this.getDependencies();
    const { state } = reasoningProgress(this.normalized());
    const now = clock.now();

    if (state === "idle") {
      this.startedAt = null;
      this.endedAt = null;
    } else if (state === "running") {
      this.startedAt ??= now;
      this.endedAt = null;
    } else if (this.startedAt !== null) {
      this.endedAt ??= now;
    }

    // Mientras piensa, se refresca cada segundo para que el cronómetro avance.
    if (state === "running" && !this.stopTicking && this.isConnected) {
      this.stopTicking = clock.every(1000, () => this.requestUpdate());
    } else if (state !== "running" && this.stopTicking) {
      this.stopTicking();
      this.stopTicking = null;
    }
  }

  protected override render() {
    const { describeReasoning, clock } = this.getDependencies();
    const view: ReasoningViewDto = describeReasoning.execute({
      steps: this.steps,
      elapsedSeconds: elapsedSeconds(this.startedAt, this.endedAt, clock.now()),
    });
    const headline = this.heading ?? view.headline;

    return html`<details part="container" ?open=${this.open} @toggle=${this.onToggle}>
      <summary part="summary">
        <span class="pulse" data-state=${view.state} aria-hidden="true"></span>
        <span class="headline" role="status" aria-live="polite">${headline}</span>
        <span class="progress">${view.progressLabel}</span>
        <span class="chevron" aria-hidden="true"></span>
      </summary>
      ${
        view.steps.length === 0
          ? nothing
          : html`<ol part="steps">
              ${view.steps.map(
                (step) =>
                  html`<li
                    part="step"
                    data-status=${step.status}
                    aria-current=${step.id === view.currentId ? "step" : "false"}
                  >
                    <span class="marker" aria-hidden="true"></span>
                    <div>
                      <div class="title">
                        ${step.title}<span class="visually-hidden"> (${step.statusLabel})</span>
                      </div>
                      ${
                        step.detail
                          ? html`<div class="detail" part="detail">${step.detail}</div>`
                          : nothing
                      }
                    </div>
                  </li>`,
              )}
            </ol>`
      }
    </details>`;
  }

  private onToggle(event: Event): void {
    const open = (event.currentTarget as HTMLDetailsElement).open;
    if (open === this.open) return;
    this.open = open;
    this.dispatchEvent(
      new CustomEvent("dz-toggle", { detail: { open }, bubbles: true, composed: true }),
    );
  }

  private normalized(): ReasoningStep[] {
    return normalizeReasoningSteps(this.steps);
  }

  private getDependencies(): ReasoningDependencies {
    const { dependencies } = this.constructor as typeof DzReasoning;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineReasoning().`,
      );
    }
    return dependencies;
  }
}
