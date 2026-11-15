import type { OrbFrameDto } from "../../../application/dtos/orb-frame-dto.js";
import { DEFAULT_ORB_VARIANT, type OrbVariant } from "../../../domain/orb/orb-variant.js";
import { ORB_VARIANT_RENDERERS } from "./variants/orb-variant-registry.js";
import { drawPulses, type OrbScene, type OrbSurface } from "./variants/variant-kit.js";

/** Radio del orbe relativo al lado menor del lienzo: deja margen para halo y partículas. */
const ORB_RADIUS_RATIO = 0.27;

/**
 * Dibuja frames del orbe en un `<canvas>` 2D. No calcula nada: prepara la escena, delega el
 * dibujo en el diseño elegido (`variant`) y agrega encima las ondas comunes a todos los
 * diseños (cambio de fase y sonar).
 */
export class OrbCanvasRenderer {
  private readonly context: CanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private variant: OrbVariant = DEFAULT_ORB_VARIANT;
  private surface: OrbSurface = "dark";
  private lastFrame: OrbFrameDto | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d");
  }

  /** Cambia el diseño y redibuja el último frame. */
  setVariant(variant: OrbVariant): void {
    this.variant = variant;
    if (this.lastFrame) this.draw(this.lastFrame);
  }

  /** Indica si el fondo es claro u oscuro (ajusta el contraste) y redibuja. */
  setSurface(surface: OrbSurface): void {
    if (surface === this.surface) return;
    this.surface = surface;
    if (this.lastFrame) this.draw(this.lastFrame);
  }

  /** Ajusta la resolución del lienzo a su tamaño CSS y redibuja el último frame. */
  resize(width: number, height: number, pixelRatio: number): void {
    this.width = width;
    this.height = height;
    this.pixelRatio = Math.min(Math.max(pixelRatio, 1), 3);
    this.canvas.width = Math.round(width * this.pixelRatio);
    this.canvas.height = Math.round(height * this.pixelRatio);
    if (this.lastFrame) this.draw(this.lastFrame);
  }

  draw(frame: OrbFrameDto): void {
    this.lastFrame = frame;
    const ctx = this.context;
    if (!ctx || this.width <= 0 || this.height <= 0) return;

    const saturation = frame.saturation;
    const surface = this.surface;
    // En fondos claros, los tonos muy claros pierden contraste: se oscurecen proporcionalmente.
    const adjust = (lightness: number): number =>
      surface === "light" ? lightness - Math.max(0, lightness - 38) * 0.38 : lightness;
    const scene: OrbScene = {
      ctx,
      frame,
      motion: frame.motion,
      cx: this.width / 2,
      cy: this.height / 2,
      r: Math.min(this.width, this.height) * ORB_RADIUS_RATIO,
      surface,
      color: (hue, lightness, alpha = 1, saturationScale = 1) =>
        `hsla(${hue.toFixed(1)}, ${(saturation * saturationScale).toFixed(1)}%, ${adjust(lightness).toFixed(1)}%, ${Math.min(1, Math.max(0, alpha)).toFixed(3)})`,
    };

    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.save();
    ORB_VARIANT_RENDERERS[this.variant](scene);
    ctx.restore();
    drawPulses(scene);
  }
}
