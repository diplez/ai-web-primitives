import type { OrbFrameDto } from "../../../application/dtos/orb-frame-dto.js";
import type { OrbPoint, OrbRing } from "../../../domain/orb/orb-geometry.js";

const TAU = Math.PI * 2;
/** Radio del orbe relativo al lado menor del lienzo: deja margen para halo y partículas. */
const ORB_RADIUS_RATIO = 0.27;
/** Longitud máxima de una estela, en radios del orbe. */
const MAX_TRAIL_LENGTH = 0.3;

/**
 * Dibuja frames del orbe en un `<canvas>` 2D. No calcula nada: solo escala y pinta el DTO.
 * Orden de capas: halo → mitad trasera de los anillos → onda → cuerpo (núcleo, sombra,
 * brillo, borde) → mitad delantera de los anillos → partículas.
 */
export class OrbCanvasRenderer {
  private readonly context: CanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private lastFrame: OrbFrameDto | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d");
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
    const context = this.context;
    if (!context || this.width <= 0 || this.height <= 0) return;

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) * ORB_RADIUS_RATIO;
    const color = (hue: number, lightness: number, alpha = 1): string =>
      `hsla(${hue.toFixed(1)}, ${frame.saturation.toFixed(1)}%, ${lightness}%, ${alpha.toFixed(3)})`;

    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    context.globalCompositeOperation = "source-over";

    // Halo
    const halo = context.createRadialGradient(
      centerX,
      centerY,
      radius * 0.5,
      centerX,
      centerY,
      radius * 1.9,
    );
    halo.addColorStop(0, color(frame.hue, 60, 0.55 * frame.glow));
    halo.addColorStop(0.45, color(frame.accentHue, 62, 0.2 * frame.glow));
    halo.addColorStop(1, color(frame.hue, 60, 0));
    context.fillStyle = halo;
    context.fillRect(0, 0, this.width, this.height);

    // Anillos: mitad trasera (queda oculta en parte por el cuerpo)
    for (const ring of frame.rings) {
      this.strokeRing(
        context,
        ring,
        centerX,
        centerY,
        radius,
        "back",
        color(frame.accentHue, 70, ring.alpha * 0.45),
      );
    }

    // Ondas de sonar
    for (const wave of frame.waves) {
      if (wave.alpha <= 0.01) continue;
      context.beginPath();
      context.arc(centerX, centerY, radius * wave.radius, 0, TAU);
      context.strokeStyle = color(frame.accentHue, 68, wave.alpha);
      context.lineWidth = Math.max(1, radius * 0.025);
      context.stroke();
    }

    // Onda de cambio de fase
    if (frame.pulse) {
      context.beginPath();
      context.arc(centerX, centerY, radius * frame.pulse.radius, 0, TAU);
      context.strokeStyle = color(frame.accentHue, 72, frame.pulse.alpha);
      context.lineWidth = Math.max(1, radius * 0.045);
      context.stroke();
    }

    // Cuerpo
    const body = context.createRadialGradient(
      centerX - radius * 0.38,
      centerY - radius * 0.42,
      0,
      centerX,
      centerY,
      radius * 1.2,
    );
    body.addColorStop(0, color(frame.accentHue, 86));
    body.addColorStop(0.3, color(frame.hue, 64));
    body.addColorStop(0.75, color(frame.hue, 42));
    body.addColorStop(1, color(frame.hue, 26));
    this.tracePath(context, frame.outline, centerX, centerY, radius);
    context.fillStyle = body;
    context.fill();

    context.save();
    this.tracePath(context, frame.outline, centerX, centerY, radius);
    context.clip();

    // Núcleo: dos lóbulos que giran dentro del cuerpo
    context.globalCompositeOperation = "screen";
    this.drawCoreLobe(
      context,
      frame,
      centerX,
      centerY,
      radius,
      0,
      0.7,
      0.22,
      color(frame.accentHue, 78, 0.95),
      color(frame.accentHue, 60, 0),
    );
    this.drawCoreLobe(
      context,
      frame,
      centerX,
      centerY,
      radius,
      Math.PI,
      0.52,
      0.26,
      color(frame.hue + 28, 76, 0.7),
      color(frame.hue + 28, 60, 0),
    );

    // Sombra propia (volumen)
    context.globalCompositeOperation = "source-over";
    const shade = context.createLinearGradient(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius,
    );
    shade.addColorStop(0.45, color(frame.hue, 15, 0));
    shade.addColorStop(1, color(frame.hue, 12, 0.4));
    context.fillStyle = shade;
    context.fillRect(centerX - radius * 1.5, centerY - radius * 1.5, radius * 3, radius * 3);

    // Brillo especular
    const highlightX = centerX - radius * 0.36;
    const highlightY = centerY - radius * 0.44;
    const highlight = context.createRadialGradient(
      highlightX,
      highlightY,
      0,
      highlightX,
      highlightY,
      radius * 0.42,
    );
    highlight.addColorStop(0, "hsla(0, 0%, 100%, 0.55)");
    highlight.addColorStop(1, "hsla(0, 0%, 100%, 0)");
    context.fillStyle = highlight;
    context.beginPath();
    context.ellipse(highlightX, highlightY, radius * 0.42, radius * 0.28, -0.6, 0, TAU);
    context.fill();
    context.restore();

    // Borde iluminado
    this.tracePath(context, frame.outline, centerX, centerY, radius);
    context.strokeStyle = color(frame.accentHue, 80, 0.45);
    context.lineWidth = Math.max(1, radius * 0.02);
    context.stroke();

    // Anillos: mitad delantera
    for (const ring of frame.rings) {
      this.strokeRing(
        context,
        ring,
        centerX,
        centerY,
        radius,
        "front",
        color(frame.accentHue, 74, ring.alpha),
      );
    }

    // Partículas con estela
    context.lineCap = "round";
    frame.particles.forEach((particle, index) => {
      if (particle.alpha < 0.02) return;
      const x = centerX + particle.x * radius;
      const y = centerY + particle.y * radius;
      const trail = frame.trails[index];
      // Una estela más larga que MAX_TRAIL_LENGTH indica que la partícula reinició su ciclo:
      // unir ambos puntos dibujaría una línea que cruza el orbe.
      if (trail && Math.hypot(particle.x - trail.x, particle.y - trail.y) < MAX_TRAIL_LENGTH) {
        context.beginPath();
        context.moveTo(centerX + trail.x * radius, centerY + trail.y * radius);
        context.lineTo(x, y);
        context.strokeStyle = color(frame.accentHue, 74, particle.alpha * 0.45);
        context.lineWidth = particle.size * radius * 1.1;
        context.stroke();
      }
      context.beginPath();
      context.arc(x, y, particle.size * radius, 0, TAU);
      context.fillStyle = color(frame.accentHue, 80, particle.alpha);
      context.fill();
    });
  }

  /** Traza una curva cerrada y suave que pasa por los puntos medios del contorno. */
  private tracePath(
    context: CanvasRenderingContext2D,
    points: readonly OrbPoint[],
    centerX: number,
    centerY: number,
    scale: number,
  ): void {
    const count = points.length;
    const first = points[0];
    const last = points[count - 1];
    context.beginPath();
    if (!first || !last) return;
    context.moveTo(
      centerX + ((last.x + first.x) / 2) * scale,
      centerY + ((last.y + first.y) / 2) * scale,
    );
    for (let i = 0; i < count; i++) {
      const current = points[i]!;
      const next = points[(i + 1) % count]!;
      context.quadraticCurveTo(
        centerX + current.x * scale,
        centerY + current.y * scale,
        centerX + ((current.x + next.x) / 2) * scale,
        centerY + ((current.y + next.y) / 2) * scale,
      );
    }
    context.closePath();
  }

  private drawCoreLobe(
    context: CanvasRenderingContext2D,
    frame: OrbFrameDto,
    centerX: number,
    centerY: number,
    radius: number,
    angleOffset: number,
    scale: number,
    offset: number,
    innerColor: string,
    outerColor: string,
  ): void {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(frame.coreRotation + angleOffset);
    context.translate(radius * offset, 0);
    const lobe = context.createRadialGradient(0, 0, 0, 0, 0, radius * scale);
    lobe.addColorStop(0, innerColor);
    lobe.addColorStop(1, outerColor);
    this.tracePath(context, frame.core, 0, 0, radius * scale);
    context.fillStyle = lobe;
    context.fill();
    context.restore();
  }

  /**
   * Dibuja la parte visible de un anillo. La elipse se recorre con su ángulo paramétrico:
   * la mitad (0, π) queda delante del orbe y la mitad (π, 2π) detrás.
   */
  private strokeRing(
    context: CanvasRenderingContext2D,
    ring: OrbRing,
    centerX: number,
    centerY: number,
    radius: number,
    side: "front" | "back",
    strokeStyle: string,
  ): void {
    if (ring.alpha <= 0.01) return;
    const visibleStart = side === "front" ? 0 : Math.PI;
    const start = ((ring.sweepStart % TAU) + TAU) % TAU;
    const end = start + ring.sweepLength;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(ring.rotation);
    context.scale(1, Math.max(ring.tilt, 0.05));
    context.strokeStyle = strokeStyle;
    context.lineWidth = Math.max(1, radius * 0.03) / Math.max(ring.tilt, 0.35);
    context.lineCap = "round";

    // El arco barrido puede cruzar el 0: se intersecta con la mitad visible en dos vueltas.
    for (const turn of [0, TAU]) {
      const from = Math.max(start, visibleStart + turn);
      const to = Math.min(end, visibleStart + Math.PI + turn);
      if (to > from) {
        context.beginPath();
        context.arc(0, 0, radius * 1.3, from, to);
        context.stroke();
      }
    }
    context.restore();
  }
}
