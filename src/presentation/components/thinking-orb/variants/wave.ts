import { TAU, drawParticles, type OrbScene } from "./variant-kit.js";

const SEGMENTS = 160;
const LAYERS = [
  { scale: 1.02, width: 0.05, light: 62, alpha: 0.95, phase: 0, accent: false },
  { scale: 0.86, width: 0.032, light: 70, alpha: 0.75, phase: 1.9, accent: true },
  { scale: 0.7, width: 0.022, light: 78, alpha: 0.55, phase: 3.7, accent: false },
] as const;

/**
 * `wave`: anillos concéntricos que vibran como una forma de onda de audio. En reposo son
 * casi círculos; al generar se encrespan con armónicos altos.
 */
export function drawWave(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const amplitude = 0.015 + motion.energy * 0.9 + motion.seek * 0.04;

  // Relleno interior suave
  const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
  fill.addColorStop(0, color(frame.accentHue, 70, 0.28 * (0.5 + frame.glow)));
  fill.addColorStop(1, color(frame.hue, 60, 0));
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.1, 0, TAU);
  ctx.fill();

  ctx.lineJoin = "round";
  for (const layer of LAYERS) {
    ctx.beginPath();
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * TAU;
      const speed = t * (0.6 + motion.speed * 1.8);
      const signal =
        Math.sin(angle * 6 + speed + layer.phase) * 0.5 +
        Math.sin(angle * 11 - speed * 1.4 + layer.phase) * 0.3 * (0.3 + motion.turbulence) +
        Math.sin(angle * 23 + speed * 2.3) * 0.2 * motion.turbulence;
      const breathing = 1 + motion.breath * Math.sin(t * 1.6 + layer.phase);
      const radius = r * layer.scale * breathing * (1 + amplitude * signal);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.shadowColor = color(layer.accent ? frame.accentHue : frame.hue, 60, 0.8 * frame.glow);
    ctx.shadowBlur = r * 0.25;
    ctx.strokeStyle = color(layer.accent ? frame.accentHue : frame.hue, layer.light, layer.alpha);
    ctx.lineWidth = Math.max(1, r * layer.width);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  drawParticles(scene, 0.8);
}
