import type { OrbFrameDto, OrbMotion } from "../../../../application/dtos/orb-frame-dto.js";
import type { OrbPoint, OrbRing } from "../../../../domain/orb/orb-geometry.js";

// Kit compartido por los diseños del orbe: tipos de la escena y utilidades de dibujo.
// Los diseños solo pintan: todo el estado (fase, colores, energía, tiempo) llega en el frame.

export const TAU = Math.PI * 2;
export const GOLDEN_ANGLE = 2.399963229728653;

/** Tipo de superficie detrás del orbe. En superficies claras se oscurecen los tonos claros. */
export type OrbSurface = "light" | "dark";

export interface OrbScene {
  readonly ctx: CanvasRenderingContext2D;
  readonly frame: OrbFrameDto;
  readonly motion: OrbMotion;
  /** Centro del lienzo, en px CSS. */
  readonly cx: number;
  readonly cy: number;
  /** Radio base del orbe, en px CSS (deja margen para halos y partículas). */
  readonly r: number;
  readonly surface: OrbSurface;
  /**
   * `hsla()` con la saturación del frame (escalable con `saturationScale`). En superficies
   * claras compensa la luminosidad para mantener el contraste.
   */
  color(hue: number, lightness: number, alpha?: number, saturationScale?: number): string;
}

/** Un diseño del orbe: recibe la escena y pinta un frame completo. */
export type OrbVariantRenderer = (scene: OrbScene) => void;

/** Pseudoaleatorio determinista en [0, 1). */
export function hash(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export const fract = (value: number): number => value - Math.floor(value);
export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
/** Potencia segura para bases negativas (evita NaN). */
export const softPow = (value: number, exponent: number): number =>
  Math.sign(value) * Math.abs(value) ** exponent;

/** Traza una curva cerrada y suave que pasa por los puntos medios del contorno. */
export function tracePath(
  ctx: CanvasRenderingContext2D,
  points: readonly OrbPoint[],
  cx: number,
  cy: number,
  scale: number,
): void {
  const count = points.length;
  const first = points[0];
  const last = points[count - 1];
  ctx.beginPath();
  if (!first || !last) return;
  ctx.moveTo(cx + ((last.x + first.x) / 2) * scale, cy + ((last.y + first.y) / 2) * scale);
  for (let i = 0; i < count; i++) {
    const current = points[i]!;
    const next = points[(i + 1) % count]!;
    ctx.quadraticCurveTo(
      cx + current.x * scale,
      cy + current.y * scale,
      cx + ((current.x + next.x) / 2) * scale,
      cy + ((current.y + next.y) / 2) * scale,
    );
  }
  ctx.closePath();
}

/** Halo difuso detrás del orbe. */
export function drawHalo(scene: OrbScene, extent = 1.9, strength = 1): void {
  const { ctx, cx, cy, r, frame, color } = scene;
  const glow = frame.glow * strength;
  const gradient = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * extent);
  gradient.addColorStop(0, color(frame.hue, 60, 0.55 * glow));
  gradient.addColorStop(0.45, color(frame.accentHue, 62, 0.2 * glow));
  gradient.addColorStop(1, color(frame.hue, 60, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r * extent, 0, TAU);
  ctx.fill();
}

/** Onda de cambio de fase y ondas de sonar (fase de búsqueda). Comunes a todos los diseños. */
export function drawPulses(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, color } = scene;
  for (const wave of frame.waves) {
    if (wave.alpha <= 0.01) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, r * wave.radius, 0, TAU);
    ctx.strokeStyle = color(frame.accentHue, 68, wave.alpha);
    ctx.lineWidth = Math.max(1, r * 0.025);
    ctx.stroke();
  }
  if (frame.pulse) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * frame.pulse.radius, 0, TAU);
    ctx.strokeStyle = color(frame.accentHue, 72, frame.pulse.alpha);
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.stroke();
  }
}

/** Longitud máxima de una estela, en radios: más larga indica que la partícula reinició su ciclo. */
const MAX_TRAIL_LENGTH = 0.3;

/** Partículas del dominio (órbita, búsqueda, emisión) con estelas. */
export function drawParticles(scene: OrbScene, sizeScale = 1, lightness = 80): void {
  const { ctx, cx, cy, r, frame, color } = scene;
  ctx.lineCap = "round";
  frame.particles.forEach((particle, index) => {
    if (particle.alpha < 0.02) return;
    const x = cx + particle.x * r;
    const y = cy + particle.y * r;
    const trail = frame.trails[index];
    if (trail && Math.hypot(particle.x - trail.x, particle.y - trail.y) < MAX_TRAIL_LENGTH) {
      ctx.beginPath();
      ctx.moveTo(cx + trail.x * r, cy + trail.y * r);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color(frame.accentHue, lightness - 6, particle.alpha * 0.45);
      ctx.lineWidth = particle.size * r * 1.1 * sizeScale;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, particle.size * r * sizeScale, 0, TAU);
    ctx.fillStyle = color(frame.accentHue, lightness, particle.alpha);
    ctx.fill();
  });
}

/**
 * Dibuja la parte visible de un anillo de escaneo inclinado. La mitad (0, π) del ángulo
 * paramétrico queda delante del orbe y la mitad (π, 2π) detrás.
 */
export function strokeScanRing(
  scene: OrbScene,
  ring: OrbRing,
  side: "front" | "back",
  strokeStyle: string,
  radiusScale = 1.3,
): void {
  const { ctx, cx, cy, r } = scene;
  if (ring.alpha <= 0.01) return;
  const visibleStart = side === "front" ? 0 : Math.PI;
  const start = ((ring.sweepStart % TAU) + TAU) % TAU;
  const end = start + ring.sweepLength;
  const tilt = Math.max(ring.tilt, 0.05);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ring.rotation);
  ctx.scale(1, tilt);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = Math.max(1, r * 0.03) / Math.max(tilt, 0.35);
  ctx.lineCap = "round";
  for (const turn of [0, TAU]) {
    const from = Math.max(start, visibleStart + turn);
    const to = Math.min(end, visibleStart + Math.PI + turn);
    if (to > from) {
      ctx.beginPath();
      ctx.arc(0, 0, r * radiusScale, from, to);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Brillo especular suave (reflejo de luz arriba a la izquierda). */
export function drawSpecular(scene: OrbScene, radius: number, strength = 0.55): void {
  const { ctx, cx, cy } = scene;
  const x = cx - radius * 0.36;
  const y = cy - radius * 0.44;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.42);
  gradient.addColorStop(0, `hsla(0, 0%, 100%, ${strength})`);
  gradient.addColorStop(1, "hsla(0, 0%, 100%, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 0.42, radius * 0.28, -0.6, 0, TAU);
  ctx.fill();
}
