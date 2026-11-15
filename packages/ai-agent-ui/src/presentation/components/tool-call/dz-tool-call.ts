import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import type { Clock } from "../../../application/ports/clock.js";
import type {
  DescribeToolCall,
  ToolCallContent,
} from "../../../application/use-cases/tool-call/describe-tool-call.js";
import {
  isToolCallActive,
  toToolCallStatus,
  type ToolCallStatus,
} from "../../../domain/tool-call/tool-call.js";
import { themeTokens } from "../../theme/theme-tokens.js";

export interface ToolCallDependencies {
  readonly describeToolCall: Pick<DescribeToolCall, "execute">;
  readonly clock: Clock;
}

/** Frecuencia de refresco del cronómetro mientras la llamada está activa. */
const TICK_MS = 100;

/**
 * Una llamada a herramienta (function calling) en vivo: los argumentos aparecen mientras el
 * modelo los escribe, luego el estado "ejecutando" con cronómetro y al final el resultado o el
 * error, en un panel expandible.
 *
 * Los argumentos aceptan JSON incompleto: se pueden ir sumando los fragmentos que envía el
 * modelo con `appendArgs()` y se muestran formateados desde el primer carácter.
 *
 * @tag dz-tool-call
 * @fires dz-toggle - Se abrió o cerró el panel. `detail: { open }`.
 * @csspart container - El `<details>` del panel.
 * @csspart header - La cabecera clicable.
 * @csspart name - El nombre de la herramienta.
 * @csspart body - El contenido expandido.
 * @csspart code - Cada bloque de argumentos o resultado.
 * @cssprop --dz-accent - Color del estado en curso.
 * @cssprop --dz-success - Color del estado completado.
 * @cssprop --dz-danger - Color del estado con error.
 */
export class DzToolCall extends LitElement {
  static dependencies?: ToolCallDependencies;

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
        overflow: hidden;
      }
      :host([status="running"]) details {
        border-color: color-mix(in srgb, var(--_accent) 55%, var(--_border));
      }
      :host([status="error"]) details {
        border-color: color-mix(in srgb, var(--_danger) 55%, var(--_border));
      }
      summary {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 14px;
        cursor: pointer;
        list-style: none;
        min-width: 0;
      }
      summary::-webkit-details-marker {
        display: none;
      }
      .icon {
        flex: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        box-sizing: border-box;
        display: grid;
        place-items: center;
      }
      [data-status="pending"] .icon {
        border: 2px dashed color-mix(in srgb, var(--_accent) 70%, transparent);
        animation: spin 3s linear infinite;
      }
      [data-status="running"] .icon {
        border: 2px solid color-mix(in srgb, var(--_accent) 25%, transparent);
        border-top-color: var(--_accent);
        animation: spin 0.8s linear infinite;
      }
      [data-status="success"] .icon {
        background: var(--_success);
      }
      [data-status="success"] .icon::after {
        content: "";
        width: 5px;
        height: 9px;
        border: solid var(--_surface);
        border-width: 0 2px 2px 0;
        transform: translateY(-1px) rotate(45deg);
      }
      [data-status="error"] .icon {
        background: var(--_danger);
      }
      [data-status="error"] .icon::after {
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
      .name {
        font-family: var(--_font-mono);
        font-weight: 600;
        font-size: 0.92em;
        flex: none;
      }
      .summary {
        color: var(--_muted);
        font-size: 0.88em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        flex: 1;
      }
      .meta {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        flex: none;
        color: var(--_muted);
        font-size: 0.82em;
        font-variant-numeric: tabular-nums;
      }
      .status {
        padding: 1px 8px;
        border-radius: 999px;
        background: var(--_surface-raised);
      }
      [data-status="running"] .status {
        color: var(--_accent);
      }
      [data-status="success"] .status {
        color: var(--_success);
      }
      [data-status="error"] .status {
        color: var(--_danger);
      }
      .chevron {
        width: 7px;
        height: 7px;
        border-right: 2px solid var(--_muted);
        border-bottom: 2px solid var(--_muted);
        transform: rotate(45deg) translateY(-2px);
        transition: transform 0.2s ease;
      }
      details[open] .chevron {
        transform: rotate(225deg) translateY(-2px);
      }
      .body {
        border-top: 1px solid var(--_border);
        padding: 10px 14px 14px;
        display: grid;
        gap: 10px;
      }
      .label {
        font-size: 0.72em;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--_muted);
        margin-bottom: 4px;
      }
      pre {
        margin: 0;
        padding: 10px 12px;
        border-radius: calc(var(--_radius) - 4px);
        background: var(--_code-bg);
        font-family: var(--_font-mono);
        font-size: 0.84em;
        line-height: 1.5;
        overflow: auto;
        max-height: var(--dz-tool-call-max-height, 280px);
        white-space: pre-wrap;
        word-break: break-word;
      }
      .t-key {
        color: var(--_accent);
      }
      .t-string {
        color: var(--_success);
      }
      .t-number,
      .t-boolean,
      .t-null {
        color: var(--_warning);
      }
      .t-punctuation {
        color: var(--_muted);
      }
      .caret {
        display: inline-block;
        width: 0.5em;
        height: 1.1em;
        margin-left: 1px;
        vertical-align: text-bottom;
        background: var(--_accent);
        animation: blink 1s steps(2, start) infinite;
      }
      @keyframes blink {
        to {
          visibility: hidden;
        }
      }
      .error {
        color: var(--_danger);
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

  /** Nombre de la herramienta (`search_docs`). */
  @property() name = "";

  /** Estado: `pending` (escribiendo argumentos), `running`, `success` o `error`. */
  @property({ reflect: true }) status: ToolCallStatus = "pending";

  /** Argumentos: texto JSON (puede estar incompleto) u objeto. */
  @property({ attribute: "args" }) args: unknown = "";

  /** Resultado: texto (si es JSON se resalta) u objeto. */
  @property({ attribute: false }) result: unknown = undefined;

  /** Mensaje de error (con `status="error"`). */
  @property() error = "";

  /**
   * Duración conocida en ms (p. ej. al mostrar el historial). Si no se indica, se mide sola
   * desde que la llamada está activa hasta que termina.
   */
  @property({ type: Number }) duration?: number;

  /** Panel expandido. */
  @property({ type: Boolean, reflect: true }) open = false;

  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private stopTicking: (() => void) | null = null;

  // ---- API imperativa -----------------------------------------------------------------------

  /** Suma un fragmento de los argumentos tal como lo envía el modelo en streaming. */
  appendArgs(delta: string): void {
    this.args =
      (typeof this.args === "string" ? this.args : JSON.stringify(this.args ?? "")) + delta;
  }

  /** Marca la herramienta como en ejecución (los argumentos están completos). */
  run(): void {
    this.status = "running";
  }

  /** Termina con éxito y muestra el resultado. */
  complete(result?: unknown): void {
    if (result !== undefined) this.result = result;
    this.status = "success";
  }

  /** Termina con error. */
  fail(error: string): void {
    this.error = error;
    this.status = "error";
  }

  /** Vuelve al estado inicial y reinicia el cronómetro. */
  reset(): void {
    this.args = "";
    this.result = undefined;
    this.error = "";
    this.status = "pending";
    this.startedAt = null;
    this.endedAt = null;
  }

  // ---- Ciclo de vida -------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.syncTimer();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopTicking?.();
    this.stopTicking = null;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("status")) {
      const status = toToolCallStatus(this.status);
      const now = this.getDependencies().clock.now();
      if (isToolCallActive(status)) {
        this.startedAt ??= now;
        this.endedAt = null;
      } else if (this.startedAt !== null) {
        // Solo se mide lo que se vio en curso: una llamada que ya llega terminada no tiene duración.
        this.endedAt ??= now;
      }
    }
    this.syncTimer();
  }

  protected override render() {
    const { describeToolCall, clock } = this.getDependencies();
    const status = toToolCallStatus(this.status);
    const measured =
      this.startedAt === null ? null : (this.endedAt ?? clock.now()) - this.startedAt;
    const elapsed = typeof this.duration === "number" ? this.duration : measured;
    const view = describeToolCall.execute({
      name: this.name,
      status,
      args: this.args,
      result: this.result,
      error: this.error,
      elapsedMs: elapsed,
    });

    return html`<details
      part="container"
      data-status=${view.status}
      ?open=${this.open}
      @toggle=${this.onToggle}
    >
      <summary part="header">
        <span class="icon" aria-hidden="true"></span>
        <span class="visually-hidden" role="status">${view.accessibleLabel}</span>
        <span class="name" part="name" aria-hidden="true">${view.name}</span>
        <span class="summary" aria-hidden="true">${view.summary}</span>
        <span class="meta" aria-hidden="true">
          ${view.durationLabel ? html`<span>${view.durationLabel}</span>` : nothing}
          <span class="status">${view.statusLabel}</span>
          <span class="chevron"></span>
        </span>
      </summary>
      <div class="body" part="body">
        ${view.args ? this.renderSection(view.labels.arguments, view.args, view.argsStreaming) : nothing}
        ${view.result ? this.renderSection(view.labels.result, view.result, false) : nothing}
        ${
          view.error
            ? html`<div>
                <div class="label">${view.labels.error}</div>
                <pre class="error" part="code">${view.error}</pre>
              </div>`
            : nothing
        }
      </div>
    </details>`;
  }

  private renderSection(label: string, content: ToolCallContent, streaming: boolean) {
    return html`<div>
      <div class="label">${label}</div>
      <pre part="code">
${
          content.kind === "text"
            ? content.text
            : content.tokens.map((token) =>
                token.type === "space"
                  ? token.text
                  : html`<span class="t-${token.type}">${token.text}</span>`,
              )
        }${streaming ? html`<span class="caret" aria-hidden="true"></span>` : nothing}</pre>
    </div>`;
  }

  private syncTimer(): void {
    const active = isToolCallActive(toToolCallStatus(this.status)) && this.startedAt !== null;
    if (active && !this.stopTicking && this.isConnected) {
      this.stopTicking = this.getDependencies().clock.every(TICK_MS, () => this.requestUpdate());
    } else if (!active && this.stopTicking) {
      this.stopTicking();
      this.stopTicking = null;
    }
  }

  private onToggle(event: Event): void {
    const open = (event.currentTarget as HTMLDetailsElement).open;
    if (open === this.open) return;
    this.open = open;
    this.dispatchEvent(
      new CustomEvent("dz-toggle", { detail: { open }, bubbles: true, composed: true }),
    );
  }

  private getDependencies(): ToolCallDependencies {
    const { dependencies } = this.constructor as typeof DzToolCall;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineToolCall().`,
      );
    }
    return dependencies;
  }
}
