import { LitElement, css, html, nothing } from "lit";
import { property, query, state } from "lit/decorators.js";
import type { Clock } from "../../../application/ports/clock.js";
import type { UiMessages } from "../../../application/ports/ui-messages.js";
import { confidencePercent, normalizeConfidence } from "../../../domain/citation/confidence.js";
import { displayHost, sanitizeHref } from "../../../domain/shared/safe-url.js";
import { formatMessage } from "../../../domain/shared/template.js";
import { themeTokens } from "../../theme/theme-tokens.js";

export interface CitationDependencies {
  readonly clock: Pick<Clock, "every">;
  readonly messages: UiMessages["citation"];
}

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 180;
const GAP_PX = 8;

/**
 * Cita de una fuente (RAG) dentro del texto: una pastilla `[1]` que al pasar el mouse,
 * enfocarla o tocarla muestra la fuente, el fragmento citado y el nivel de coincidencia.
 *
 * La tarjeta usa la Popover API (capa superior del navegador), así que nunca queda
 * recortada por contenedores con `overflow`.
 *
 * @tag dz-citation
 * @slot - Contenido de la pastilla. Por defecto, el `index`.
 * @fires dz-citation-open - Se mostró la tarjeta.
 * @csspart pill - La pastilla.
 * @csspart card - La tarjeta flotante.
 * @csspart snippet - El fragmento citado.
 * @csspart confidence - La barra de coincidencia.
 * @cssprop --dz-accent - Color de la pastilla y la barra.
 * @cssprop --dz-citation-width - Ancho máximo de la tarjeta (por defecto 320px).
 */
export class DzCitation extends LitElement {
  static dependencies?: CitationDependencies;

  static override styles = [
    themeTokens,
    css`
      :host {
        display: inline;
        position: relative;
      }
      .pill {
        font: inherit;
        font-size: 0.75em;
        font-weight: 600;
        line-height: 1;
        vertical-align: 0.15em;
        min-width: 1.6em;
        padding: 0.2em 0.45em;
        margin: 0 0.1em;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--_accent) 35%, transparent);
        background: color-mix(in srgb, var(--_accent) 12%, transparent);
        color: var(--_accent);
        cursor: pointer;
      }
      .pill:hover,
      .pill[aria-expanded="true"] {
        background: var(--_accent);
        color: var(--_accent-contrast);
      }
      .card {
        position: fixed;
        inset: auto;
        margin: 0;
        width: max-content;
        max-width: min(var(--dz-citation-width, 320px), calc(100vw - 24px));
        box-sizing: border-box;
        padding: 12px 14px;
        border: 1px solid var(--_border);
        border-radius: var(--_radius);
        background: var(--_surface);
        color: var(--_text);
        box-shadow: 0 10px 30px -10px rgb(0 0 0 / 0.35);
        font-size: 0.875rem;
        line-height: 1.45;
        display: grid;
        gap: 8px;
      }
      .card:not(:popover-open) {
        display: none;
      }
      .eyebrow {
        font-size: 0.75em;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--_muted);
      }
      .source {
        font-weight: 600;
      }
      .host {
        color: var(--_muted);
        font-size: 0.85em;
      }
      .snippet {
        margin: 0;
        padding-left: 10px;
        border-left: 3px solid var(--_border);
        color: var(--_muted);
      }
      .confidence {
        display: grid;
        gap: 4px;
        font-size: 0.8em;
        color: var(--_muted);
      }
      .track {
        height: 4px;
        border-radius: 999px;
        background: var(--_border);
        overflow: hidden;
      }
      .bar {
        height: 100%;
        background: var(--_accent);
        transform-origin: left;
      }
      a {
        color: var(--_accent);
        font-weight: 600;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
    `,
  ];

  /** Número o etiqueta de la cita. */
  @property() index = "";

  /** URL de la fuente (se descartan esquemas inseguros). */
  @property() href = "";

  /** Nombre o título de la fuente. */
  @property() source = "";

  /** Fragmento del documento citado. */
  @property() snippet = "";

  /** Nivel de coincidencia: `0.87`, `87` o `"87%"`. */
  @property() confidence: number | string | null = null;

  @state() private expanded = false;

  @query(".pill") private pill?: HTMLButtonElement;
  @query(".card") private card?: HTMLElement;

  private cancelTimer: (() => void) | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cancelTimer?.();
    this.hide();
  }

  protected override render() {
    const { messages } = this.getDependencies();
    const href = this.href ? sanitizeHref(this.href) : null;
    const host = href ? displayHost(href) : null;
    const confidence = normalizeConfidence(this.confidence);

    return html`<button
        type="button"
        class="pill"
        part="pill"
        aria-expanded=${String(this.expanded)}
        aria-controls="card"
        aria-label=${`${messages.source} ${this.index} ${this.source}`.trim()}
        @click=${this.toggle}
        @pointerenter=${() => this.schedule(true)}
        @pointerleave=${() => this.schedule(false)}
        @focus=${() => this.schedule(true)}
        @blur=${() => this.schedule(false)}
        @keydown=${(event: KeyboardEvent) => event.key === "Escape" && this.hide()}
      >
        <slot>${this.index || "↗"}</slot>
      </button>
      <div
        id="card"
        class="card"
        part="card"
        popover="manual"
        role="tooltip"
        @pointerenter=${() => this.schedule(true)}
        @pointerleave=${() => this.schedule(false)}
      >
        <div class="eyebrow">${messages.source} ${this.index}</div>
        ${this.source ? html`<div class="source">${this.source}</div>` : nothing}
        ${host ? html`<div class="host">${host}</div>` : nothing}
        ${
          this.snippet
            ? html`<blockquote class="snippet" part="snippet">${this.snippet}</blockquote>`
            : nothing
        }
        ${
          confidence === null
            ? nothing
            : html`<div class="confidence" part="confidence">
                <span
                  >${formatMessage(messages.confidence, { percent: confidencePercent(confidence) })}</span
                >
                <div class="track">
                  <div class="bar" style="transform: scaleX(${confidence})"></div>
                </div>
              </div>`
        }
        ${
          href
            ? html`<a
                href=${href}
                target="_blank"
                rel="noopener noreferrer"
                @focus=${() => this.schedule(true)}
                @blur=${() => this.schedule(false)}
                >${messages.open} ↗</a
              >`
            : nothing
        }
      </div>`;
  }

  private toggle(): void {
    if (this.expanded) this.hide();
    else this.show();
  }

  private schedule(open: boolean): void {
    this.cancelTimer?.();
    const cancel = this.getDependencies().clock.every(open ? OPEN_DELAY_MS : CLOSE_DELAY_MS, () => {
      cancel();
      this.cancelTimer = null;
      if (open) this.show();
      else this.hide();
    });
    this.cancelTimer = cancel;
  }

  private show(): void {
    const card = this.card;
    const pill = this.pill;
    if (!card || !pill || this.expanded) return;
    this.expanded = true;
    if (typeof card.showPopover === "function") card.showPopover();
    this.position(card, pill);
    this.dispatchEvent(new CustomEvent("dz-citation-open", { bubbles: true, composed: true }));
  }

  private hide(): void {
    if (!this.expanded) return;
    this.expanded = false;
    const card = this.card;
    if (card && typeof card.hidePopover === "function" && card.matches(":popover-open")) {
      card.hidePopover();
    }
  }

  /** Ubica la tarjeta sobre la pastilla (o debajo si no entra), dentro de la ventana. */
  private position(card: HTMLElement, pill: HTMLElement): void {
    const anchor = pill.getBoundingClientRect();
    const box = card.getBoundingClientRect();
    const margin = 12;
    const left = Math.min(
      Math.max(margin, anchor.left + anchor.width / 2 - box.width / 2),
      window.innerWidth - box.width - margin,
    );
    const above = anchor.top - box.height - GAP_PX;
    const top = above >= margin ? above : anchor.bottom + GAP_PX;
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  private getDependencies(): CitationDependencies {
    const { dependencies } = this.constructor as typeof DzCitation;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineCitation().`,
      );
    }
    return dependencies;
  }
}
