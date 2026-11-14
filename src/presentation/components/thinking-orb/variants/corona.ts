import { GOLDEN_ANGLE, TAU, drawHalo, drawSpecular, type OrbScene } from "./variant-kit.js";

const RAYS = 44;

/**
 * `corona`: sol con rayos que crecen y laten con la energía. Al buscar, los rayos barren
 * como el haz de un faro; al terminar se retraen y el sol se calma.
 */
export function drawCorona(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const core = r * 0.62 * (1 + motion.breath * Math.sin(t * 1.6));
  const spin = t * (0.05 + motion.seek * 0.8 + motion.speed * 0.1);
  const beam = (t * 1.3) % TAU;

  drawHalo(scene, 1.9, 1.1);

  ctx.lineCap = "round";
  for (let i = 0; i < RAYS; i++) {
    const angle = (i / RAYS) * TAU + spin;
    const flicker = 0.5 + 0.5 * Math.sin(t * (1.5 + motion.speed * 3) + i * GOLDEN_ANGLE);
    let length = r * (0.12 + (0.25 + motion.energy * 4 + motion.emit * 0.25) * flicker);
    // Haz del faro: los rayos cerca del ángulo del haz se alargan
    const distance = Math.abs(((angle - beam + Math.PI * 3) % TAU) - Math.PI);
    length += r * motion.seek * 0.55 * Math.max(0, 1 - distance / 0.6);
    const start = core * 1.05;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * start, cy + Math.sin(angle) * start);
    ctx.lineTo(cx + Math.cos(angle) * (start + length), cy + Math.sin(angle) * (start + length));
    ctx.strokeStyle = color(i % 2 === 0 ? frame.accentHue : frame.hue, 70, 0.35 + 0.5 * flicker);
    ctx.lineWidth = Math.max(1, r * (0.025 + 0.02 * flicker));
    ctx.stroke();
  }

  // Disco solar
  const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, core);
  disc.addColorStop(0, "hsla(0, 0%, 100%, 0.95)");
  disc.addColorStop(0.35, color(frame.accentHue, 78));
  disc.addColorStop(1, color(frame.hue, 52));
  ctx.beginPath();
  ctx.arc(cx, cy, core, 0, TAU);
  ctx.fillStyle = disc;
  ctx.fill();
  drawSpecular(scene, core, 0.35);
}
