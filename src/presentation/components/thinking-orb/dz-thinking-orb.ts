import { LitElement, html, type PropertyValues } from "lit";
import { property, query } from "lit/decorators.js";
import type {
  AnimateThinkingOrb,
  OrbAnimationHandle,
} from "../../../application/use-cases/orb/animate-thinking-orb.js";
import type { GetThinkingStatus } from "../../../application/use-cases/thinking/get-thinking-status.js";
import { toOrbVariant, type OrbVariant } from "../../../domain/orb/orb-variant.js";
import { parseRgbColor } from "../../../domain/shared/color.js";
import type { ThinkingPhase } from "../../../domain/thinking/thinking-phase.js";
import { thinkingOrbStyles } from "./dz-thinking-orb.styles.js";
import { OrbCanvasRenderer } from "./orb-canvas-renderer.js";
import { readOrbPalette } from "./read-orb-palette.js";

/** Dependencias que la capa de composición inyecta en el componente. */
export interface ThinkingOrbDependencies {
  readonly animateThinkingOrb: Pick<AnimateThinkingOrb, "execute">;
  readonly getThinkingStatus: Pick<GetThinkingStatus, "execute">;
}

/**
 * Orbe animado que expresa la fase de pensamiento de un modelo de lenguaje con
 * movimiento, no solo con color: respira en reposo, escanea al analizar, lanza
 * pulsos de sonar al buscar, forja tokens al generar y se asienta al terminar.
 * Las fases se transforman una en otra de forma continua.
 *
 * Respeta `prefers-reduced-motion` (muestra una pose estática por fase) y pausa la
 * animación cuando sale de la pantalla.
 *
 * Se registra con `defineThinkingOrb()` (capa de composición).
 *
 * Hay 12 diseños (`variant`): `sphere` (por defecto), `nebula`, `atom`, `wave`, `crystal`,
 * `lava`, `gyro`, `swarm`, `pixel`, `halo`, `corona` y `enso`. Todos expresan las mismas
 * fases y transicionan igual; cambia la forma de dibujarlas.
 *
 * @tag dz-thinking-orb
 * @csspart orb - Contenedor del lienzo del orbe.
 * @csspart label - Texto de estado. Siempre disponible para lectores de pantalla; visible con `show-label`.
 * @cssprop [--dz-orb-size=96px] - Tamaño del orbe (ancho y alto).
 * @cssprop --dz-orb-color - Color principal (cualquier color CSS: `#ff0066`, `hotpink`, `var(--dz-accent)`). Sobrescribe el de la fase.
 * @cssprop --dz-orb-accent - Color de acento de núcleo, anillos y partículas (cualquier color CSS).
 * @cssprop --dz-orb-hue - Matiz principal (número 0–360). Alternativa numérica a `--dz-orb-color`.
 * @cssprop --dz-orb-accent-hue - Matiz de acento (número 0–360) de núcleo, anillos y partículas.
 * @cssprop --dz-orb-saturation - Saturación (número 0–100).
 * @cssprop [--dz-orb-label-color=currentColor] - Color del texto de estado.
 */
export class DzThinkingOrb extends LitElement {
  static dependencies?: ThinkingOrbDependencies;

  static override styles = thinkingOrbStyles;

  /** Fase actual del modelo. Se refleja como atributo para poder estilizarla con CSS. */
  @property({ reflect: true }) phase: ThinkingPhase = "idle";

  /** Diseño visual del orbe. Un valor desconocido usa `sphere`. */
  @property({ reflect: true }) variant: OrbVariant = "sphere";

  /** Texto de estado personalizado. Por defecto se deriva de `phase`. */
  @property() label?: string;

  /** Muestra el texto de estado debajo del orbe. */
  @property({ type: Boolean, reflect: true, attribute: "show-label" }) showLabel = false;

  @query("canvas") private canvas?: HTMLCanvasElement;

  private animation: OrbAnimationHandle | null = null;
  private renderer: OrbCanvasRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  /**
   * Vuelve a leer los colores de CSS y transiciona hacia ellos. Útil después de cambiar
   * `--dz-orb-color` o el tema sin cambiar de fase (los cambios de fase ya los leen solos).
   */
  refreshColors(): void {
    this.renderer?.setSurface(this.surface());
    this.animation?.setPhase(this.phase, this.palette());
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Al re-insertarse en el DOM (p. ej. al moverlo) se reanuda la animación.
    if (this.hasUpdated) this.startAnimation();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopAnimation();
  }

  protected override firstUpdated(): void {
    this.startAnimation();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("variant")) this.renderer?.setVariant(toOrbVariant(this.variant));
    if (changed.has("phase") && changed.get("phase") !== undefined) {
      this.renderer?.setSurface(this.surface());
      this.animation?.setPhase(this.phase, this.palette());
    }
  }

  protected override render() {
    const status = this.getDependencies().getThinkingStatus.execute({
      phase: this.phase,
      customLabel: this.label,
    });

    return html`<div part="orb" class="orb"><canvas aria-hidden="true"></canvas></div>
      <span class="color-probe" aria-hidden="true"></span>
      <span
        part="label"
        class=${this.showLabel ? "label" : "label visually-hidden"}
        role="status"
        aria-live="polite"
        aria-busy=${String(status.busy)}
        data-phase=${status.phase}
        >${status.label}</span
      >`;
  }

  private startAnimation(): void {
    if (this.animation || !this.canvas) return;
    const canvas = this.canvas;

    this.renderer = new OrbCanvasRenderer(canvas);
    this.renderer.setVariant(toOrbVariant(this.variant));
    this.renderer.setSurface(this.surface());
    const measure = (): void => {
      const { width, height } = canvas.getBoundingClientRect();
      this.renderer?.resize(width, height, globalThis.devicePixelRatio || 1);
    };
    measure();
    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(measure);
      this.resizeObserver.observe(canvas);
    }

    this.animation = this.getDependencies().animateThinkingOrb.execute({
      phase: this.phase,
      palette: this.palette(),
      onFrame: (frame) => this.renderer?.draw(frame),
    });

    if (typeof IntersectionObserver === "function") {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (entry) this.animation?.setVisible(entry.isIntersecting);
      });
      this.intersectionObserver.observe(this);
    }
  }

  /**
   * Superficie detrás del orbe, deducida del color de texto heredado: texto claro implica
   * fondo oscuro. Funciona con cualquier tema sin configuración.
   */
  private surface(): "light" | "dark" {
    const rgb = parseRgbColor(getComputedStyle(this).color);
    if (!rgb) return "dark";
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance > 0.5 ? "dark" : "light";
  }

  private palette() {
    return readOrbPalette(getComputedStyle(this), (color) => this.resolveColor(color));
  }

  /** Normaliza cualquier color CSS a `rgb(…)` con un elemento de prueba en el shadow DOM. */
  private resolveColor(color: string): string {
    const probe = this.renderRoot.querySelector<HTMLElement>(".color-probe");
    if (!probe) return color;
    probe.style.color = "";
    probe.style.color = color;
    return getComputedStyle(probe).color;
  }

  private stopAnimation(): void {
    this.animation?.stop();
    this.animation = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.renderer = null;
  }

  private getDependencies(): ThinkingOrbDependencies {
    const { dependencies } = this.constructor as typeof DzThinkingOrb;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineThinkingOrb().`,
      );
    }
    return dependencies;
  }
}
