import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { UiMessages } from "../../../application/ports/ui-messages.js";
import type {
  ApprovalCountdownHandle,
  ApprovalCountdownTick,
  RunApprovalCountdown,
} from "../../../application/use-cases/approval/run-approval-countdown.js";
import {
  decisionOnTimeout,
  toApprovalTone,
  toTimeoutAction,
  toTimeoutSeconds,
  type ApprovalDecision,
  type ApprovalReason,
  type ApprovalStatus,
} from "../../../domain/approval/approval.js";
import { formatMessage } from "../../../domain/shared/template.js";
import { themeTokens } from "../../theme/theme-tokens.js";

export interface ApprovalDependencies {
  readonly runApprovalCountdown: Pick<RunApprovalCountdown, "execute">;
  readonly messages: UiMessages["approval"];
}

/**
 * Tarjeta "human-in-the-loop": el agente pide permiso antes de una acción.
 *
 * Con `timeout` muestra una cuenta regresiva que se **pausa** mientras la persona pasa el
 * mouse o tiene el foco dentro (WCAG 2.2.1). Al vencer aplica `timeout-action`, que por
 * seguridad es `deny` salvo que se indique lo contrario.
 *
 * @tag dz-approval
 * @slot - Descripción de la acción.
 * @slot details - Contenido extra: un diff, un comando, la lista de archivos afectados…
 * @fires dz-approve - Se aprobó. `detail: { reason: "user" | "timeout" }`.
 * @fires dz-deny - Se denegó. `detail: { reason: "user" | "timeout" }`.
 * @fires dz-decision - Cualquier decisión. `detail: { decision: "approved" | "denied", reason }`.
 * @csspart card - La tarjeta.
 * @csspart heading - El título.
 * @csspart details - Contenedor del slot `details`.
 * @csspart timer - Barra y texto de la cuenta regresiva.
 * @csspart actions - Contenedor de los botones.
 * @csspart approve-button - Botón aprobar.
 * @csspart deny-button - Botón denegar.
 * @csspart resolution - Mensaje con la decisión tomada.
 * @cssprop --dz-accent - Color del botón aprobar (tono `neutral`).
 * @cssprop --dz-warning - Color de énfasis con `tone="warning"`.
 * @cssprop --dz-danger - Color de énfasis con `tone="danger"`.
 */
export class DzApproval extends LitElement {
  static dependencies?: ApprovalDependencies;

  static override styles = [
    themeTokens,
    css`
      :host {
        display: block;
        color: var(--_text);
        --_tone: var(--_accent);
      }
      :host([tone="warning"]) {
        --_tone: var(--_warning);
      }
      :host([tone="danger"]) {
        --_tone: var(--_danger);
      }
      .card {
        border: 1px solid var(--_border);
        border-left: 4px solid var(--_tone);
        border-radius: var(--_radius);
        background: var(--_surface);
        padding: 14px 16px;
        display: grid;
        gap: 10px;
      }
      h3 {
        margin: 0;
        font-size: 1em;
        font-weight: 650;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .badge {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        flex: none;
        display: grid;
        place-items: center;
        font-size: 13px;
        font-weight: 700;
        color: var(--_surface);
        background: var(--_tone);
      }
      .description {
        color: var(--_muted);
      }
      .details {
        border-radius: calc(var(--_radius) - 4px);
        background: var(--_surface-raised);
        padding: 10px 12px;
        overflow-x: auto;
        font-size: 0.9em;
      }
      .details[hidden] {
        display: none;
      }
      .timer {
        display: grid;
        gap: 6px;
        font-size: 0.85em;
        color: var(--_muted);
        font-variant-numeric: tabular-nums;
      }
      .track {
        height: 4px;
        border-radius: 999px;
        background: var(--_border);
        overflow: hidden;
      }
      .bar {
        height: 100%;
        background: var(--_tone);
        transform-origin: left;
        transition: transform 0.1s linear;
      }
      .timer[data-paused] .bar {
        opacity: 0.45;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }
      button {
        font: inherit;
        font-weight: 600;
        border-radius: 8px;
        padding: 7px 16px;
        cursor: pointer;
        border: 1px solid var(--_border);
        background: var(--_surface);
        color: var(--_text);
      }
      button:hover {
        border-color: var(--_muted);
      }
      .approve {
        background: var(--_tone);
        border-color: var(--_tone);
        color: var(--_accent-contrast);
      }
      .approve:hover {
        filter: brightness(1.08);
        border-color: var(--_tone);
      }
      .resolution {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      .resolution[data-decision="approved"] {
        color: var(--_success);
      }
      .resolution[data-decision="denied"] {
        color: var(--_danger);
      }
    `,
  ];

  /** Título de la solicitud. */
  @property() heading = "";

  /** Segundos para decidir. `0` o sin valor: sin límite de tiempo. */
  @property({ attribute: "timeout" }) timeout: number | string = 0;

  /** Qué pasa al vencer el tiempo: `deny` (por defecto) o `approve`. */
  @property({ attribute: "timeout-action" }) timeoutAction: "deny" | "approve" = "deny";

  /** Nivel de riesgo: `neutral`, `warning` o `danger`. */
  @property({ reflect: true }) tone: "neutral" | "warning" | "danger" = "neutral";

  /** Texto del botón aprobar (por defecto, el del idioma configurado). */
  @property({ attribute: "approve-label" }) approveLabel?: string;

  /** Texto del botón denegar. */
  @property({ attribute: "deny-label" }) denyLabel?: string;

  /** Estado de la solicitud. Se refleja como atributo para poder estilizarlo. */
  @property({ reflect: true }) status: ApprovalStatus = "pending";

  /** Quién decidió: `user` o `timeout`. */
  @property({ reflect: true }) reason: ApprovalReason | null = null;

  @state() private tick: ApprovalCountdownTick | null = null;
  @state() private hasDetails = false;

  private countdown: ApprovalCountdownHandle | null = null;
  private pointerInside = false;
  private focusInside = false;

  /** Aprueba la solicitud (equivale a pulsar el botón). */
  approve(): void {
    this.decide("approved", "user");
  }

  /** Deniega la solicitud. */
  deny(): void {
    this.decide("denied", "user");
  }

  /** Vuelve a dejar la solicitud pendiente y reinicia la cuenta regresiva. */
  reset(): void {
    this.status = "pending";
    this.reason = null;
    this.startCountdown();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && this.status === "pending") this.startCountdown();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopCountdown();
  }

  protected override firstUpdated(): void {
    if (this.status === "pending") this.startCountdown();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (this.hasUpdated && changed.has("timeout") && changed.get("timeout") !== undefined) {
      if (this.status === "pending") this.startCountdown();
    }
  }

  protected override render() {
    const { messages } = this.getDependencies();
    const tone = toApprovalTone(this.tone);
    return html`<section
      class="card"
      part="card"
      role="group"
      aria-labelledby="heading"
      @pointerenter=${() => this.setPointerInside(true)}
      @pointerleave=${() => this.setPointerInside(false)}
      @focusin=${() => this.setFocusInside(true)}
      @focusout=${(event: FocusEvent) => {
        const next = event.relatedTarget as Node | null;
        if (!next || (!this.contains(next) && !this.renderRoot.contains(next))) {
          this.setFocusInside(false);
        }
      }}
    >
      <h3 id="heading" part="heading">
        <span class="badge" aria-hidden="true">${tone === "neutral" ? "?" : "!"}</span>
        ${this.heading}
      </h3>
      <div class="description"><slot></slot></div>
      <div class="details" part="details" ?hidden=${!this.hasDetails}>
        <slot name="details" @slotchange=${this.onDetailsChange}></slot>
      </div>
      ${this.status === "pending" ? this.renderPending(messages) : this.renderResolution(messages)}
    </section>`;
  }

  private renderPending(messages: UiMessages["approval"]) {
    const tick = this.tick;
    const timerText =
      tick === null
        ? ""
        : tick.paused
          ? messages.paused
          : formatMessage(
              toTimeoutAction(this.timeoutAction) === "approve"
                ? messages.autoApproveIn
                : messages.autoDenyIn,
              { seconds: tick.remainingSeconds },
            );

    return html`${
        tick
          ? html`<div class="timer" part="timer" ?data-paused=${tick.paused}>
              <div class="track">
                <div class="bar" style="transform: scaleX(${tick.fraction})"></div>
              </div>
              <span>${timerText}</span>
            </div>`
          : nothing
      }
      <div class="actions" part="actions">
        <button type="button" class="deny" part="deny-button" @click=${this.deny}>
          ${this.denyLabel ?? messages.deny}
        </button>
        <button type="button" class="approve" part="approve-button" @click=${this.approve}>
          ${this.approveLabel ?? messages.approve}
        </button>
      </div>`;
  }

  private renderResolution(messages: UiMessages["approval"]) {
    const automatic = this.reason === "timeout";
    const text =
      this.status === "approved"
        ? automatic
          ? messages.approvedAutomatically
          : messages.approved
        : automatic
          ? messages.deniedAutomatically
          : messages.denied;
    return html`<div
      class="resolution"
      part="resolution"
      role="status"
      data-decision=${this.status}
    >
      <span aria-hidden="true">${this.status === "approved" ? "✓" : "✕"}</span>${text}
    </div>`;
  }

  private decide(decision: ApprovalDecision, reason: ApprovalReason): void {
    if (this.status !== "pending") return;
    this.stopCountdown();
    this.status = decision;
    this.reason = reason;
    const detail = { reason };
    this.dispatchEvent(
      new CustomEvent(decision === "approved" ? "dz-approve" : "dz-deny", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
    this.dispatchEvent(
      new CustomEvent("dz-decision", {
        detail: { decision, reason },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private startCountdown(): void {
    this.stopCountdown();
    const seconds = toTimeoutSeconds(this.timeout);
    if (seconds <= 0) return;
    this.countdown = this.getDependencies().runApprovalCountdown.execute({
      seconds,
      onTick: (tick) => {
        this.tick = tick;
      },
      onExpire: () =>
        this.decide(decisionOnTimeout(toTimeoutAction(this.timeoutAction)), "timeout"),
    });
    if (this.pointerInside || this.focusInside) this.countdown.pause();
  }

  private stopCountdown(): void {
    this.countdown?.cancel();
    this.countdown = null;
    this.tick = null;
  }

  private setPointerInside(inside: boolean): void {
    this.pointerInside = inside;
    this.syncPause();
  }

  private setFocusInside(inside: boolean): void {
    this.focusInside = inside;
    this.syncPause();
  }

  private syncPause(): void {
    if (!this.countdown) return;
    if (this.pointerInside || this.focusInside) this.countdown.pause();
    else this.countdown.resume();
  }

  private onDetailsChange(event: Event): void {
    const slot = event.target as HTMLSlotElement;
    this.hasDetails = slot
      .assignedNodes({ flatten: true })
      .some((node) => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim());
  }

  private getDependencies(): ApprovalDependencies {
    const { dependencies } = this.constructor as typeof DzApproval;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineApproval().`,
      );
    }
    return dependencies;
  }
}
