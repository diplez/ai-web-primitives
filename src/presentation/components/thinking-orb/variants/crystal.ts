import { TAU, drawHalo, drawParticles, hash, type OrbScene } from "./variant-kit.js";

const SIDES = 7;
const LIGHT_ANGLE = -2.2;

/**
 * `crystal`: gema facetada low-poly que gira lentamente. Cada faceta se ilumina según su
 * orientación; al analizar la cruza una línea de escaneo y al generar las facetas destellan.
 */
export function drawCrystal(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const rotation = t * (0.12 + motion.speed * 0.25);
  const breathing = 1 + motion.breath * Math.sin(t * 1.6);

  drawHalo(scene, 1.8, 0.9);

  const vertex = (index: number, radius: number, offset: number) => {
    const angle = rotation + offset + (index / SIDES) * TAU;
    const wobble = 1 + motion.energy * 1.4 * Math.sin(t * 2.1 + index * 1.3);
    return {
      x: cx + Math.cos(angle) * radius * wobble * breathing,
      y: cy + Math.sin(angle) * radius * wobble * breathing,
      angle,
    };
  };

  const outer = Array.from({ length: SIDES }, (unused, i) => vertex(i, r * 1.05, 0));
  const inner = Array.from({ length: SIDES }, (unused, i) => vertex(i, r * 0.55, Math.PI / SIDES));
  const flickerSlot = Math.floor(t * 9);

  const facet = (points: { x: number; y: number }[], normal: number, seed: number) => {
    const facing = Math.max(0, Math.cos(normal - LIGHT_ANGLE));
    const flicker = motion.turbulence * 22 * hash(seed + flickerSlot * 31);
    const lightness = 30 + facing * 42 + flicker;
    ctx.beginPath();
    points.forEach((point, index) =>
      index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
    );
    ctx.closePath();
    ctx.fillStyle = color(seed % 2 === 0 ? frame.hue : frame.accentHue, Math.min(88, lightness));
    ctx.fill();
    ctx.strokeStyle = color(frame.accentHue, 88, 0.35);
    ctx.lineWidth = Math.max(1, r * 0.012);
    ctx.stroke();
  };

  for (let i = 0; i < SIDES; i++) {
    const next = (i + 1) % SIDES;
    // Faceta exterior (trapecio partido en dos triángulos) y faceta interior (corona)
    facet([outer[i]!, outer[next]!, inner[i]!], outer[i]!.angle + Math.PI / SIDES, i * 3);
    facet([outer[next]!, inner[next]!, inner[i]!], inner[i]!.angle + 0.4, i * 3 + 1);
    facet(
      [{ x: cx, y: cy }, inner[i]!, inner[next]!],
      inner[i]!.angle + Math.PI / SIDES + 0.9,
      i * 3 + 2,
    );
  }

  // Línea de escaneo recortada a la gema
  if (motion.scan > 0.01) {
    ctx.save();
    ctx.beginPath();
    outer.forEach((point, index) =>
      index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
    );
    ctx.closePath();
    ctx.clip();
    const y = cy + Math.sin(t * 1.6) * r * 1.05;
    const band = ctx.createLinearGradient(0, y - r * 0.18, 0, y + r * 0.18);
    band.addColorStop(0, color(frame.accentHue, 90, 0));
    band.addColorStop(0.5, color(frame.accentHue, 92, 0.75 * motion.scan));
    band.addColorStop(1, color(frame.accentHue, 90, 0));
    ctx.fillStyle = band;
    ctx.fillRect(cx - r * 1.5, y - r * 0.18, r * 3, r * 0.36);
    ctx.restore();
  }

  // Destellos en vértices
  outer.forEach((point, index) => {
    const sparkle = Math.max(0, Math.sin(t * 2.7 + index * 2.3)) ** 6;
    if (sparkle < 0.05) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, r * 0.06 * sparkle, 0, TAU);
    ctx.fillStyle = `hsla(0, 0%, 100%, ${(0.9 * sparkle).toFixed(3)})`;
    ctx.fill();
  });

  drawParticles(scene, 0.8);
}
