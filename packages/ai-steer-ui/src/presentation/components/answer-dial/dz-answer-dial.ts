import { LitElement, css, html, nothing, svg, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { Clock } from "../../../application/ports/clock.js";
import type { MotionPreference } from "../../../application/ports/motion-preference.js";
import type { UiMessages } from "../../../application/ports/ui-messages.js";
import type {
  AnswerDialSession,
  DialSelection,
} from "../../../application/use-cases/answer-dial/answer-dial-session.js";
import {
  MORPH_TIMING,
  type planMorph,
} from "../../../application/use-cases/answer-dial/plan-morph.js";
import {
  isOriginal,
  normalizeDials,
  normalizeValues,
  type Dial,
  type DialInput,
  type DialValues,
} from "../../../domain/dial/dial.js";
import { buildRewriteInstruction } from "../../../domain/dial/rewrite-instruction.js";
import { formatMessage } from "../../../domain/shared/format.js";
import type { DiffOp } from "../../../domain/text/word-diff.js";
import { themeTokens } from "../../theme/theme-tokens.js";

export interface AnswerDialDependencies {
  readonly createSession: () => AnswerDialSession;
  readonly planMorph: typeof planMorph;
  readonly clock: Clock;
  readonly motion: MotionPreference;
  readonly messages: UiMessages["answerDial"];
}

/** Lo que recibe la función `rewrite`. */
export interface RewriteRequest {
  /** Instrucción lista para enviar al modelo (en inglés), p. ej. "Make it much shorter." */
  readonly instruction: string;
  /** La respuesta original, sin reescrituras. */
  readonly original: string;
  /** Posición de cada perilla. */
  readonly values: DialValues;
  /** Se cancela si el usuario mueve otra vez las perillas antes de que termine. */
  readonly signal: AbortSignal;
}

/** Función que reescribe la respuesta. Puede ser asíncrona (lo normal: llama a tu modelo). */
export type RewriteFunction = (request: RewriteRequest) => Promise<string> | string;

/** Un fragmento del texto en pantalla, con su animación. */
interface ShownToken {
  readonly text: string;
  readonly op: DiffOp;
  readonly delay: number;
  readonly animate: boolean;
}

/** Acepta un array JSON en el atributo `dials`. */
const dialsConverter = {
  fromAttribute(value: string | null): DialInput[] {
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as DialInput[]) : [];
    } catch {
      return value.split(",").map((part) => part.trim()) as DialInput[];
    }
  },
};

/** Recorrido de cada perilla en grados (de -135° a 135°, 0° arriba). */
const SWEEP = 270;
const TICK_RADIUS = 27;

/**
 * Perillas para ajustar una respuesta de IA sin escribir otro prompt: más corta o más larga,
 * más simple o más técnica, más casual o más formal. Al girarlas, la respuesta se reescribe y
 * cambia **en su lugar, palabra por palabra**: se ve qué cambió.
 *
 * Con la propiedad `rewrite` el componente pide la reescritura por su cuenta (con la
 * instrucción ya armada para el modelo); sin ella, emite `dz-dial-change` y la app entrega el
 * texto con `showRewrite()`. Las posiciones ya vistas se recuerdan: volver a ellas no vuelve a
 * llamar al modelo. La posición central de cada perilla es la respuesta original.
 *
 * @tag dz-answer-dial
 * @fires dz-dial-change - Las perillas se detuvieron en una posición nueva. `detail: { values, instruction, cached, original }`.
 * @fires dz-rewrite-error - La función `rewrite` falló. `detail: { error }`.
 * @csspart controls - La barra con las perillas.
 * @csspart dial - Cada perilla con sus etiquetas.
 * @csspart knob - El control giratorio.
 * @csspart answer - El texto de la respuesta.
 * @csspart reset-button - El botón para volver a la respuesta original.
 * @cssprop --dz-accent - Color de las perillas y de las palabras que cambian.
 */
export class DzAnswerDial extends LitElement {
  static dependencies?: AnswerDialDependencies;

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
      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 22px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--_border);
      }
      .dial {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .end {
        font: inherit;
        font-size: 0.8em;
        color: var(--_muted);
        background: none;
        border: 0;
        padding: 2px 4px;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
      }
      .end:hover {
        color: var(--_text);
      }
      .end.active {
        color: var(--_accent);
        font-weight: 600;
      }
      .knob {
        width: 52px;
        height: 52px;
        flex: none;
        border-radius: 50%;
        cursor: grab;
        touch-action: none;
        user-select: none;
      }
      .knob:active {
        cursor: grabbing;
      }
      .knob svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      .body {
        fill: var(--_surface-raised);
        stroke: var(--_border);
      }
      .tick {
        fill: color-mix(in srgb, var(--_muted) 55%, transparent);
      }
      .tick.center {
        fill: var(--_text);
      }
      .tick.on {
        fill: var(--_accent);
      }
      .arc {
        fill: none;
        stroke: var(--_accent);
        stroke-width: 3;
        stroke-linecap: round;
      }
      .pointer {
        stroke: var(--_text);
        stroke-width: 2.5;
        stroke-linecap: round;
        transition: transform 0.18s ease;
      }
      .spacer {
        flex: 1;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 0.82em;
        color: var(--_muted);
      }
      .spinner {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid color-mix(in srgb, var(--_accent) 25%, transparent);
        border-top-color: var(--_accent);
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .reset {
        font: inherit;
        font-size: 0.82em;
        color: var(--_text);
        background: var(--_surface-raised);
        border: 1px solid var(--_border);
        border-radius: calc(var(--_radius) - 4px);
        padding: 4px 10px;
        cursor: pointer;
      }
      .reset:hover {
        border-color: var(--_accent);
      }
      .reset[disabled] {
        opacity: 0.45;
        cursor: default;
        border-color: var(--_border);
      }
      .answer {
        padding: 14px 16px 16px;
        line-height: 1.65;
        transition: opacity 0.25s ease;
      }
      .text {
        white-space: pre-wrap;
      }
      :host([busy]) .answer {
        opacity: 0.55;
      }
      .error {
        padding: 0 16px 14px;
        font-size: 0.88em;
        color: var(--_danger);
      }
      .out {
        animation: leave ${MORPH_TIMING.leave}ms ease forwards;
      }
      .in {
        animation:
          enter ${MORPH_TIMING.enter}ms ease both,
          mark 1.6s ease both;
      }
      @keyframes leave {
        to {
          opacity: 0;
          filter: blur(3px);
        }
      }
      @keyframes enter {
        from {
          opacity: 0;
          filter: blur(4px);
        }
      }
      @keyframes mark {
        from {
          color: var(--_accent);
          background: color-mix(in srgb, var(--_accent) 16%, transparent);
        }
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

  /** La respuesta original. Asignar un texto nuevo reinicia las perillas y olvida las reescrituras. */
  @property() text = "";

  /**
   * Perillas: nombres de las incluidas (`length`, `level`, `tone`) u objetos
   * `{ id, start, end, startHint?, endHint?, steps? }`. Por defecto, `length` y `level`.
   */
  @property({ attribute: "dials", converter: dialsConverter }) dials: DialInput[] = [];

  /** Posición de cada perilla (`{ length: 1 }`). El centro de cada una es la respuesta original. */
  @property({ attribute: false }) values: DialValues = {};

  /** Reescribe la respuesta. Recibe `{ instruction, original, values, signal }` y devuelve el texto. */
  @property({ attribute: false }) rewrite?: RewriteFunction;

  /** Milisegundos que espera a que las perillas se detengan antes de pedir la reescritura. */
  @property({ type: Number, attribute: "settle-delay" }) settleDelay = 350;

  /** `true` mientras se espera una reescritura (solo lectura; reflejado para estilizar). */
  @property({ type: Boolean, reflect: true }) busy = false;

  @state() private tokens: ShownToken[] = [];
  @state() private error = "";

  private session?: AnswerDialSession;
  private shownText = "";
  private requestKey: string | null = null;
  private cancelSettle: (() => void) | null = null;
  private cancelMorph: (() => void) | null = null;
  private controller: AbortController | null = null;

  // ---- API imperativa -----------------------------------------------------------------------

  /** Mueve una perilla a una posición. */
  setDial(id: string, step: number): void {
    this.values = normalizeValues(this.normalizedDials(), { ...this.values, [id]: step });
  }

  /** Vuelve todas las perillas al centro: la respuesta original. */
  reset(): void {
    this.values = normalizeValues(this.normalizedDials(), {});
  }

  /**
   * Entrega la reescritura pedida en `dz-dial-change` (si no usas la propiedad `rewrite`).
   * Si el usuario ya movió las perillas a otra posición, el texto se guarda pero no se muestra.
   */
  showRewrite(text: string): void {
    if (this.requestKey === null) return;
    this.deliver(this.requestKey, text);
  }

  // ---- Ciclo de vida -------------------------------------------------------------------------

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cancelSettle?.();
    this.cancelMorph?.();
    this.controller?.abort();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const session = this.getSession();
    if (changed.has("text")) {
      // Respuesta nueva: perillas al centro, sin reescrituras guardadas.
      session.start(this.text);
      this.cancelPending();
      this.values = normalizeValues(this.normalizedDials(), {});
      this.showText(this.text);
      return;
    }
    if (changed.has("values") || changed.has("dials")) {
      const values = normalizeValues(this.normalizedDials(), this.values);
      if (!sameValues(values, this.values)) this.values = values;
      const previous = (changed.get("values") as DialValues | undefined) ?? {};
      if (this.hasUpdated && !sameValues(values, previous)) this.select(values);
    }
  }

  protected override render() {
    const { messages } = this.getDependencies();
    const dials = this.normalizedDials();
    const values = normalizeValues(dials, this.values);
    const original = isOriginal(dials, values);

    return html`<div class="frame">
      <div class="controls" part="controls">
        ${dials.map((dial) => this.renderDial(dial, values[dial.id] ?? dial.center))}
        <span class="spacer"></span>
        <span class="status" role="status" aria-live="polite">
          ${this.busy ? html`<span class="spinner" aria-hidden="true"></span>${messages.rewriting}` : nothing}
        </span>
        <button
          type="button"
          class="reset"
          part="reset-button"
          ?disabled=${original}
          @click=${this.reset}
        >
          ↺ ${messages.reset}
        </button>
      </div>
      <div class="answer" part="answer" aria-busy=${this.busy ? "true" : "false"}>
        <span class="text">${this.renderTokens()}</span>
      </div>
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
    </div>`;
  }

  /**
   * Fragmentos del texto. Van pegados al `<span class="text">` (con `white-space: pre-wrap`):
   * cualquier espacio del template se vería en pantalla.
   */
  private renderTokens() {
    return this.tokens.map((token) =>
      token.animate
        ? html`<span
            class=${token.op === "delete" ? "out" : token.op === "insert" ? "in" : ""}
            style=${token.delay ? `animation-delay: ${token.delay}ms, ${token.delay}ms` : ""}
            >${token.text}</span
          >`
        : token.text,
    );
  }

  private renderDial(dial: Dial, value: number) {
    const { messages } = this.getDependencies();
    const label = `${dial.start} ↔ ${dial.end}`;
    const valueText =
      value === dial.center
        ? messages.original
        : formatMessage(messages.position, {
            label: value < dial.center ? dial.start : dial.end,
            step: Math.abs(value - dial.center),
            total: dial.center,
          });
    const angle = (step: number): number => -SWEEP / 2 + (SWEEP * step) / (dial.steps - 1);
    const point = (degrees: number, radius: number): [number, number] => {
      const radians = (degrees * Math.PI) / 180;
      return [radius * Math.sin(radians), -radius * Math.cos(radians)];
    };
    const from = angle(Math.min(value, dial.center));
    const to = angle(Math.max(value, dial.center));
    const [x1, y1] = point(from, TICK_RADIUS);
    const [x2, y2] = point(to, TICK_RADIUS);
    const onSide = (step: number): boolean =>
      (value < dial.center && step >= value && step < dial.center) ||
      (value > dial.center && step <= value && step > dial.center);

    return html`<div class="dial" part="dial">
      <button
        type="button"
        class="end ${value < dial.center ? "active" : ""}"
        tabindex="-1"
        aria-hidden="true"
        @click=${() => this.setDial(dial.id, value - 1)}
      >
        ${dial.start}
      </button>
      <div
        class="knob"
        part="knob"
        role="slider"
        tabindex="0"
        aria-label=${label}
        aria-valuemin="0"
        aria-valuemax=${dial.steps - 1}
        aria-valuenow=${value}
        aria-valuetext=${valueText}
        @pointerdown=${(event: PointerEvent) => this.onPointerDown(event, dial)}
        @pointermove=${(event: PointerEvent) => this.onPointerMove(event, dial)}
        @wheel=${(event: WheelEvent) => this.onWheel(event, dial, value)}
        @keydown=${(event: KeyboardEvent) => this.onKey(event, dial, value)}
      >
        <svg viewBox="-32 -32 64 64" aria-hidden="true">
          ${[...Array(dial.steps).keys()].map((step) => {
            const [x, y] = point(angle(step), TICK_RADIUS);
            const classes = `tick ${step === dial.center ? "center" : ""} ${onSide(step) ? "on" : ""}`;
            return svg`<circle class=${classes} cx=${x} cy=${y} r=${step === dial.center ? 2.6 : 1.8}></circle>`;
          })}
          ${value === dial.center ? nothing : svg`<path class="arc" d="M ${x1} ${y1} A ${TICK_RADIUS} ${TICK_RADIUS} 0 0 1 ${x2} ${y2}"></path>`}
          <circle class="body" r="19"></circle>
          <line
            class="pointer"
            x1="0"
            y1="-6"
            x2="0"
            y2="-15"
            style="transform: rotate(${angle(value)}deg)"
          ></line>
        </svg>
      </div>
      <button
        type="button"
        class="end ${value > dial.center ? "active" : ""}"
        tabindex="-1"
        aria-hidden="true"
        @click=${() => this.setDial(dial.id, value + 1)}
      >
        ${dial.end}
      </button>
    </div>`;
  }

  // ---- Interacción ---------------------------------------------------------------------------

  private onPointerDown(event: PointerEvent, dial: Dial): void {
    const knob = event.currentTarget as HTMLElement;
    knob.setPointerCapture?.(event.pointerId);
    knob.focus();
    this.setFromPointer(event, knob, dial);
  }

  private onPointerMove(event: PointerEvent, dial: Dial): void {
    const knob = event.currentTarget as HTMLElement;
    if (knob.hasPointerCapture?.(event.pointerId)) this.setFromPointer(event, knob, dial);
  }

  /** Convierte la posición del puntero en el paso más cercano según el ángulo. */
  private setFromPointer(event: PointerEvent, knob: HTMLElement, dial: Dial): void {
    const rect = knob.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < 4) return;
    const degrees = Math.max(
      -SWEEP / 2,
      Math.min(SWEEP / 2, (Math.atan2(dx, -dy) * 180) / Math.PI),
    );
    this.setDial(dial.id, Math.round(((degrees + SWEEP / 2) / SWEEP) * (dial.steps - 1)));
  }

  private onWheel(event: WheelEvent, dial: Dial, value: number): void {
    event.preventDefault();
    this.setDial(dial.id, value + (event.deltaY < 0 ? 1 : -1));
  }

  private onKey(event: KeyboardEvent, dial: Dial, value: number): void {
    const next: Record<string, number> = {
      ArrowRight: value + 1,
      ArrowUp: value + 1,
      PageUp: value + 1,
      ArrowLeft: value - 1,
      ArrowDown: value - 1,
      PageDown: value - 1,
      Home: 0,
      End: dial.steps - 1,
      Escape: dial.center,
    };
    const target = next[event.key];
    if (target === undefined) return;
    event.preventDefault();
    this.setDial(dial.id, target);
  }

  // ---- Reescritura ---------------------------------------------------------------------------

  /** Las perillas cambiaron: muestra lo conocido al instante o pide la reescritura al detenerse. */
  private select(values: DialValues): void {
    const dials = this.normalizedDials();
    const selection = this.getSession().select(dials, values);
    this.cancelSettle?.();
    this.cancelSettle = null;
    this.controller?.abort();
    this.controller = null;
    this.error = "";

    if (selection.kind !== "request") {
      this.busy = false;
      this.requestKey = null;
      this.showText(selection.text);
      this.emitChange(values, selection, buildRewriteInstruction(dials, values));
      return;
    }
    this.busy = true;
    this.requestKey = selection.key;
    this.cancelSettle = this.getDependencies().clock.after(this.settleDelay, () => {
      this.cancelSettle = null;
      this.request(values, selection);
    });
  }

  private request(
    values: DialValues,
    selection: Extract<DialSelection, { kind: "request" }>,
  ): void {
    this.emitChange(values, selection, selection.instruction);
    const rewrite = this.rewrite;
    if (!rewrite) return; // La app entrega el texto con showRewrite().

    const controller = new AbortController();
    this.controller = controller;
    const original = this.getSession().originalText;
    Promise.resolve()
      .then(() =>
        rewrite({
          instruction: selection.instruction,
          original,
          values,
          signal: controller.signal,
        }),
      )
      .then((text) => {
        if (!controller.signal.aborted) this.deliver(selection.key, String(text));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || !this.getSession().reject(selection.key)) return;
        this.busy = false;
        this.requestKey = null;
        this.error = this.getDependencies().messages.failed;
        this.dispatchEvent(
          new CustomEvent("dz-rewrite-error", { detail: { error }, bubbles: true, composed: true }),
        );
      });
  }

  private deliver(key: string, text: string): void {
    if (!this.getSession().resolve(key, text)) return;
    this.busy = false;
    this.requestKey = null;
    this.showText(text);
  }

  private emitChange(values: DialValues, selection: DialSelection, instruction: string): void {
    this.dispatchEvent(
      new CustomEvent("dz-dial-change", {
        detail: {
          values,
          instruction,
          cached: selection.kind !== "request",
          original: selection.kind === "original",
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private cancelPending(): void {
    this.cancelSettle?.();
    this.cancelSettle = null;
    this.controller?.abort();
    this.controller = null;
    this.requestKey = null;
    this.busy = false;
    this.error = "";
  }

  // ---- Transición del texto -------------------------------------------------------------------

  /** Muestra un texto nuevo: primero se van las palabras borradas y después entran las nuevas. */
  private showText(next: string): void {
    const { planMorph, motion, clock } = this.getDependencies();
    const plan = planMorph(this.shownText, next, motion.prefersReducedMotion());
    this.shownText = next;
    this.cancelMorph?.();
    this.cancelMorph = null;
    const settled = plan.entering.map((token) => ({ ...token, delay: 0, animate: false }));
    if (plan.instant) {
      this.tokens = settled;
      return;
    }
    this.tokens = plan.leaving.map((token) => ({
      ...token,
      delay: 0,
      animate: token.op === "delete",
    }));
    this.cancelMorph = clock.after(MORPH_TIMING.leave, () => {
      this.tokens = plan.entering.map((token) => ({ ...token, animate: token.op === "insert" }));
      this.cancelMorph = clock.after(MORPH_TIMING.enter + MORPH_TIMING.stagger + 1300, () => {
        this.cancelMorph = null;
        this.tokens = settled;
      });
    });
  }

  // ---- Utilidades ----------------------------------------------------------------------------

  private normalizedDials(): Dial[] {
    return normalizeDials(this.dials, this.getDependencies().messages.presets);
  }

  private getSession(): AnswerDialSession {
    this.session ??= this.getDependencies().createSession();
    return this.session;
  }

  private getDependencies(): AnswerDialDependencies {
    const { dependencies } = this.constructor as typeof DzAnswerDial;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineAnswerDial().`,
      );
    }
    return dependencies;
  }
}

function sameValues(a: DialValues, b: DialValues): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}
