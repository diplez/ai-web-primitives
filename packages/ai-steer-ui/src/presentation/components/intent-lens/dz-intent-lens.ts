// © 2026 Diego Lopez (diplez). All rights reserved.
import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { UiMessages } from "../../../application/ports/ui-messages.js";
import type {
  IntentReviewResult,
  ReviewIntent,
} from "../../../application/use-cases/intent-lens/review-intent.js";
import {
  isUnsure,
  type IntentEdit,
  type IntentInput,
  type IntentItem,
  type IntentItemKind,
} from "../../../domain/intent/intent.js";
import { formatMessage } from "../../../domain/shared/format.js";
import { themeTokens } from "../../theme/theme-tokens.js";

export interface IntentLensDependencies {
  readonly createReview: () => ReviewIntent;
  readonly messages: UiMessages["intentLens"];
}

/** Estado de la revisión. */
export type IntentLensStatus = "review" | "confirmed";

/** Acepta un objeto JSON en el atributo `intent`. */
const intentConverter = {
  fromAttribute(value: string | null): IntentInput | null {
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null ? (parsed as IntentInput) : null;
    } catch {
      return null;
    }
  },
};

/** Qué se está escribiendo en línea: el objetivo, una ficha nueva o una alternativa propia. */
type Editing =
  | { readonly target: "goal" }
  | { readonly target: "new"; readonly kind: IntentItemKind }
  | { readonly target: "own"; readonly id: string };

/**
 * "Esto es lo que entendí": antes de actuar, el agente muestra cómo interpretó el pedido en
 * fichas editables (objetivo, restricciones y suposiciones). El usuario corrige lo que esté
 * mal y confirma; la app recibe las correcciones y una instrucción lista para el modelo.
 *
 * Las suposiciones con poca confianza del modelo se marcan como dudosas para que el usuario
 * las revise primero. `INTENT_REQUEST_PROMPT` le pide al modelo la interpretación en el
 * formato que acepta el componente.
 *
 * @tag dz-intent-lens
 * @fires dz-intent-change - El usuario corrigió algo. `detail: { intent, changes, instruction }`.
 * @fires dz-intent-confirm - El usuario confirmó. `detail: { intent, changes, instruction }`.
 * @csspart header - El título.
 * @csspart chip - Cada ficha (con `data-kind`, `data-state`).
 * @csspart menu - El menú de alternativas de una suposición.
 * @csspart confirm-button - El botón para confirmar.
 * @cssprop --dz-accent - Color del objetivo, las correcciones y el botón principal.
 * @cssprop --dz-warning - Color de las suposiciones dudosas.
 */
export class DzIntentLens extends LitElement {
  static dependencies?: IntentLensDependencies;

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
      }
      header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--_border);
        font-weight: 600;
      }
      .lens {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid var(--_accent);
        position: relative;
        flex: none;
      }
      .lens::after {
        content: "";
        position: absolute;
        width: 7px;
        height: 2px;
        background: var(--_accent);
        right: -6px;
        bottom: -2px;
        transform: rotate(45deg);
        border-radius: 2px;
      }
      .count {
        margin-left: auto;
        font-size: 0.78em;
        font-weight: 600;
        color: var(--_accent);
        background: color-mix(in srgb, var(--_accent) 14%, transparent);
        padding: 2px 9px;
        border-radius: 999px;
      }
      dl {
        margin: 0;
        padding: 12px 16px 4px;
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        gap: 8px 16px;
        align-items: start;
      }
      dt {
        font-size: 0.72em;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--_muted);
        padding-top: 7px;
      }
      dd {
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        min-width: 0;
      }
      .wrap {
        position: relative;
        display: inline-flex;
        max-width: 100%;
      }
      .chip {
        font: inherit;
        font-size: 0.9em;
        color: var(--_text);
        background: var(--_surface-raised);
        border: 1px solid var(--_border);
        border-radius: 999px;
        padding: 3px 11px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        max-width: 100%;
        text-align: left;
      }
      .chip:hover:not([disabled]) {
        border-color: var(--_accent);
      }
      .chip[disabled] {
        cursor: default;
      }
      .chip .label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .chip[data-kind="goal"] {
        border-color: color-mix(in srgb, var(--_accent) 55%, var(--_border));
        font-weight: 600;
      }
      .chip[data-kind="assumption"] {
        border-style: dashed;
      }
      .chip[data-state="changed"] {
        border-style: solid;
        border-color: var(--_success);
        color: var(--_success);
      }
      .chip[data-state="added"] {
        border-style: solid;
        border-color: var(--_success);
      }
      .chip[data-state="removed"] .label {
        text-decoration: line-through;
        opacity: 0.55;
      }
      .chip[data-unsure] {
        border-color: var(--_warning);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--_warning) 18%, transparent);
      }
      .unsure {
        font-size: 0.78em;
        font-weight: 600;
        color: var(--_warning);
      }
      .icon {
        color: var(--_muted);
        font-size: 0.85em;
      }
      .x {
        font: inherit;
        font-size: 0.8em;
        color: var(--_muted);
        background: none;
        border: 0;
        padding: 0 2px;
        cursor: pointer;
        border-radius: 4px;
      }
      .x:hover {
        color: var(--_danger);
      }
      .add {
        border-style: dashed;
        color: var(--_muted);
        background: transparent;
      }
      .menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 10;
        min-width: 200px;
        max-width: min(320px, 80vw);
        display: grid;
        padding: 4px;
        background: var(--_surface);
        border: 1px solid var(--_border);
        border-radius: calc(var(--_radius) - 2px);
        box-shadow: 0 10px 30px rgb(0 0 0 / 0.25);
      }
      .menu button {
        font: inherit;
        font-size: 0.9em;
        text-align: left;
        color: var(--_text);
        background: none;
        border: 0;
        border-radius: 6px;
        padding: 6px 10px;
        cursor: pointer;
      }
      .menu button:hover,
      .menu button:focus-visible {
        background: color-mix(in srgb, var(--_accent) 14%, transparent);
      }
      .menu .danger {
        color: var(--_danger);
      }
      .menu hr {
        border: 0;
        border-top: 1px solid var(--_border);
        margin: 4px 2px;
      }
      .menu .hint {
        font-size: 0.8em;
        color: var(--_warning);
        padding: 4px 10px 6px;
      }
      input {
        font: inherit;
        font-size: 0.9em;
        color: var(--_text);
        background: var(--_surface);
        border: 1px solid var(--_accent);
        border-radius: 999px;
        padding: 3px 11px;
        min-width: 12ch;
        outline: none;
      }
      footer {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 12px;
        padding: 12px 16px;
        border-top: 1px solid var(--_border);
        margin-top: 10px;
        font-size: 0.9em;
      }
      .question {
        color: var(--_muted);
        margin-right: auto;
      }
      .done {
        color: var(--_success);
        margin-right: auto;
      }
      .button {
        font: inherit;
        font-size: 0.95em;
        border-radius: calc(var(--_radius) - 4px);
        padding: 6px 14px;
        cursor: pointer;
        border: 1px solid var(--_border);
        background: var(--_surface-raised);
        color: var(--_text);
      }
      .button.primary {
        background: var(--_accent);
        color: var(--_accent-contrast);
        border-color: transparent;
        font-weight: 600;
      }
      :host([status="confirmed"]) dl {
        opacity: 0.8;
      }
    `,
  ];

  /**
   * La interpretación del modelo: `{ goal, constraints: [...], assumptions: [...] }`. Cada
   * suposición puede traer `options` (alternativas) y `confidence` (0 a 1).
   */
  @property({ attribute: "intent", converter: intentConverter }) intent: IntentInput | null = null;

  /** Título (por defecto, "Here's what I understood"). */
  @property() heading?: string;

  /** `review` mientras el usuario revisa; `confirmed` después de confirmar (reflejado). */
  @property({ reflect: true }) status: IntentLensStatus = "review";

  @state() private revision = 0;
  @state() private menuFor: string | null = null;
  @state() private editing: Editing | null = null;

  private review?: ReviewIntent;
  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (this.menuFor && !event.composedPath().includes(this)) this.menuFor = null;
  };

  // ---- API imperativa -----------------------------------------------------------------------

  /** Aplica una corrección desde código (las mismas que hace el usuario). */
  edit(edit: IntentEdit): void {
    if (this.getReview().apply(edit)) this.changed();
  }

  /** Descarta las correcciones y vuelve a la interpretación del modelo. */
  reset(): void {
    this.getReview().reset();
    this.changed();
  }

  /** Confirma la interpretación (con las correcciones) y emite `dz-intent-confirm`. */
  confirm(): IntentReviewResult {
    const result = this.getReview().result();
    this.menuFor = null;
    this.editing = null;
    this.status = "confirmed";
    this.dispatchEvent(
      new CustomEvent("dz-intent-confirm", { detail: result, bubbles: true, composed: true }),
    );
    return result;
  }

  /** Vuelve a permitir correcciones después de confirmar. */
  reopen(): void {
    this.status = "review";
  }

  /** La interpretación actual, con las correcciones y la instrucción para el modelo. */
  get result(): IntentReviewResult {
    return this.getReview().result();
  }

  // ---- Ciclo de vida -------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("pointerdown", this.onDocumentPointerDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("pointerdown", this.onDocumentPointerDown);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("intent")) {
      this.getReview().start(this.intent);
      this.status = "review";
      this.menuFor = null;
      this.editing = null;
    }
  }

  protected override updated(changed: PropertyValues): void {
    // Al abrir un menú o empezar a escribir, el foco va al control nuevo.
    if (changed.has("editing") && this.editing) {
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus();
    } else if (changed.has("menuFor") && this.menuFor) {
      this.renderRoot.querySelector<HTMLButtonElement>(".menu button")?.focus();
    }
  }

  protected override render() {
    const { messages } = this.getDependencies();
    const intent = this.getReview().intent;
    const { changes } = this.getReview().result();
    const readonly = this.status === "confirmed";
    const count =
      changes.length === 1
        ? messages.oneChange
        : formatMessage(messages.changes, { count: changes.length });

    return html`<div class="frame" @keydown=${this.onKeydown}>
      <header part="header">
        <span class="lens" aria-hidden="true"></span>${this.heading ?? messages.heading}
        ${changes.length > 0 ? html`<span class="count">${count}</span>` : nothing}
      </header>
      <dl>
        <dt>${messages.goal}</dt>
        <dd>${this.renderGoal(intent.goal, intent.goal !== intent.originalGoal, readonly)}</dd>
        <dt>${messages.constraints}</dt>
        <dd>${this.renderItems("constraint", readonly)}</dd>
        <dt>${messages.assumptions}</dt>
        <dd>${this.renderItems("assumption", readonly)}</dd>
      </dl>
      <footer>
        ${
          readonly
            ? html`<span class="done" role="status">✓ ${messages.confirmed}</span>
                <button type="button" class="button" @click=${this.reopen}>
                  ${messages.reopen}
                </button>`
            : html`<span class="question">${messages.question}</span>
                ${
                  changes.length > 0
                    ? html`<button type="button" class="button" @click=${this.reset}>
                        ${messages.reset}
                      </button>`
                    : nothing
                }
                <button
                  type="button"
                  class="button primary"
                  part="confirm-button"
                  @click=${this.confirm}
                >
                  ${changes.length > 0 ? messages.confirmWithChanges : messages.confirm}
                </button>`
        }
      </footer>
    </div>`;
  }

  private renderGoal(goal: string, changed: boolean, readonly: boolean): TemplateResult {
    const { messages } = this.getDependencies();
    if (this.editing?.target === "goal") return this.renderInput(goal, messages.editGoal);
    return html`<button
      type="button"
      class="chip"
      part="chip"
      data-kind="goal"
      data-state=${changed ? "changed" : "original"}
      ?disabled=${readonly}
      aria-label=${`${messages.editGoal}: ${goal}`}
      @click=${() => (this.editing = { target: "goal" })}
    >
      <span class="label">${goal || "…"}</span
      >${readonly ? nothing : html`<span class="icon">✎</span>`}
    </button>`;
  }

  private renderItems(kind: IntentItemKind, readonly: boolean): TemplateResult {
    const { messages } = this.getDependencies();
    const items = this.getReview().intent.items.filter((item) => item.kind === kind);
    const adding = this.editing?.target === "new" && this.editing.kind === kind;
    return html`${items.map((item) =>
      kind === "assumption"
        ? this.renderAssumption(item, readonly)
        : this.renderConstraint(item, readonly),
    )}
    ${
      readonly
        ? nothing
        : adding
          ? this.renderInput(
              "",
              kind === "constraint" ? messages.addConstraint : messages.addAssumption,
            )
          : html`<button
              type="button"
              class="chip add"
              @click=${() => (this.editing = { target: "new", kind })}
            >
              + ${messages.add}
            </button>`
    }`;
  }

  private renderConstraint(item: IntentItem, readonly: boolean): TemplateResult {
    const { messages } = this.getDependencies();
    const toggle = () => this.edit({ type: item.removed ? "restore" : "remove", id: item.id });
    return html`<span class="chip" part="chip" data-kind="constraint" data-state=${itemState(item)}>
      <span class="label">${item.text}</span>
      ${
        readonly
          ? nothing
          : html`<button
              type="button"
              class="x"
              aria-label=${`${item.removed ? messages.restore : messages.remove}: ${item.text}`}
              @click=${toggle}
            >
              ${item.removed ? "↺" : "✕"}
            </button>`
      }
    </span>`;
  }

  private renderAssumption(item: IntentItem, readonly: boolean): TemplateResult {
    const { messages } = this.getDependencies();
    if (this.editing?.target === "own" && this.editing.id === item.id) {
      return this.renderInput(item.text, messages.writeOwn);
    }
    const unsure = isUnsure(item) && item.text === item.originalText && !item.removed;
    const open = this.menuFor === item.id;
    return html`<span class="wrap">
      <button
        type="button"
        class="chip"
        part="chip"
        data-kind="assumption"
        data-id=${item.id}
        data-state=${itemState(item)}
        ?data-unsure=${unsure}
        ?disabled=${readonly}
        aria-haspopup="true"
        aria-expanded=${open ? "true" : "false"}
        title=${unsure ? messages.unsureHint : ""}
        @click=${() => (this.menuFor = open ? null : item.id)}
      >
        <span class="label">${item.text}</span>
        ${unsure ? html`<span class="unsure">${messages.unsure}</span>` : nothing}
        ${readonly ? nothing : html`<span class="icon" aria-hidden="true">▾</span>`}
      </button>
      ${open ? this.renderMenu(item) : nothing}
    </span>`;
  }

  private renderMenu(item: IntentItem): TemplateResult {
    const { messages } = this.getDependencies();
    const choose = (text: string) => {
      this.menuFor = null;
      this.edit({ type: "replace", id: item.id, text });
    };
    const options = item.options.filter((option) => option !== item.text);
    return html`<div class="menu" part="menu">
      ${isUnsure(item) ? html`<div class="hint">${messages.unsureHint}</div>` : nothing}
      ${
        !item.added && item.text !== item.originalText
          ? html`<button type="button" @click=${() => choose(item.originalText)}>
              ${formatMessage(messages.keepOriginal, { text: item.originalText })}
            </button>`
          : nothing
      }
      ${options.map((option) => html`<button type="button" @click=${() => choose(option)}>${option}</button>`)}
      <button
        type="button"
        @click=${() => {
          this.menuFor = null;
          this.editing = { target: "own", id: item.id };
        }}
      >
        ✎ ${messages.writeOwn}
      </button>
      <hr />
      <button
        type="button"
        class=${item.removed ? "" : "danger"}
        @click=${() => {
          this.menuFor = null;
          this.edit({ type: item.removed ? "restore" : "remove", id: item.id });
        }}
      >
        ${item.removed ? `↺ ${messages.restore}` : `✕ ${messages.remove}`}
      </button>
    </div>`;
  }

  private renderInput(value: string, label: string): TemplateResult {
    return html`<input
      .value=${value}
      aria-label=${label}
      placeholder=${label}
      @keydown=${this.onInputKeydown}
      @blur=${this.onInputBlur}
    />`;
  }

  // ---- Interacción ---------------------------------------------------------------------------

  private onInputKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.commitInput((event.target as HTMLInputElement).value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.editing = null;
    }
  }

  private onInputBlur(event: FocusEvent): void {
    // Un campo ya quitado (p. ej. cancelado con Escape) puede emitir un blur tardío cuando se
    // enfoca el siguiente: no debe aplicar su texto.
    const input = event.target as HTMLInputElement;
    if (this.editing && input.isConnected) this.commitInput(input.value);
  }

  private commitInput(value: string): void {
    const editing = this.editing;
    this.editing = null;
    if (!editing) return;
    if (editing.target === "goal") this.edit({ type: "goal", text: value });
    else if (editing.target === "new") this.edit({ type: "add", kind: editing.kind, text: value });
    else this.edit({ type: "replace", id: editing.id, text: value });
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !this.menuFor) return;
    // Al cerrar el menú con Escape, el foco vuelve a la ficha que lo abrió.
    const id = this.menuFor;
    this.menuFor = null;
    void this.updateComplete.then(() =>
      this.renderRoot.querySelector<HTMLButtonElement>(`.chip[data-id="${id}"]`)?.focus(),
    );
  }

  private changed(): void {
    this.revision++;
    this.dispatchEvent(
      new CustomEvent("dz-intent-change", {
        detail: this.getReview().result(),
        bubbles: true,
        composed: true,
      }),
    );
  }

  private getReview(): ReviewIntent {
    this.review ??= this.getDependencies().createReview();
    return this.review;
  }

  private getDependencies(): IntentLensDependencies {
    const { dependencies } = this.constructor as typeof DzIntentLens;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineIntentLens().`,
      );
    }
    return dependencies;
  }
}

function itemState(item: IntentItem): "original" | "changed" | "removed" | "added" {
  if (item.removed) return "removed";
  if (item.added) return "added";
  return item.text !== item.originalText ? "changed" : "original";
}
