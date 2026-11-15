import { TAU, drawParticles, type OrbScene } from "./variant-kit.js";

const COMETS = 3;

/**
 * `halo`: anillo luminoso con un degradado que fluye y cometas de luz que lo recorren.
 * El centro queda vacío: funciona bien sobre fotos, avatares o contenido.
 */
export function drawHaloRing(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const radius = r * 1.05 * (1 + motion.breath * Math.sin(t * 1.6));
  const thickness = r * (0.1 + motion.energy * 0.6);
  const flow = t * (0.3 + motion.speed * 0.9);

  // Resplandor interior
  const inner = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
  inner.addColorStop(0, color(frame.hue, 60, 0));
  inner.addColorStop(1, color(frame.hue, 60, 0.22 * (0.5 + frame.glow)));
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.fill();

  // Anillo con degradado cónico que rota (con respaldo lineal en navegadores sin conic)
  const gradient =
    typeof ctx.createConicGradient === "function"
      ? ctx.createConicGradient(flow, cx, cy)
      : ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
  gradient.addColorStop(0, color(frame.hue, 62, 0.95));
  gradient.addColorStop(0.33, color(frame.accentHue, 70, 0.95));
  gradient.addColorStop(0.66, color(frame.hue + 25, 66, 0.95));
  gradient.addColorStop(1, color(frame.hue, 62, 0.95));

  ctx.save();
  ctx.shadowColor = color(frame.accentHue, 65, 0.85 * frame.glow);
  ctx.shadowBlur = r * 0.35;
  ctx.beginPath();
  // Con turbulencia, el anillo ondula levemente
  for (let i = 0; i <= 120; i++) {
    const angle = (i / 120) * TAU;
    const wobble = 1 + motion.turbulence * 0.04 * Math.sin(angle * 7 + t * 4);
    const x = cx + Math.cos(angle) * radius * wobble;
    const y = cy + Math.sin(angle) * radius * wobble;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.stroke();
  ctx.restore();

  // Cometas
  ctx.lineCap = "round";
  for (let i = 0; i < COMETS; i++) {
    const head = flow * (1.6 + i * 0.35) + (i * TAU) / COMETS;
    const length = 0.35 + motion.energy * 3 + motion.scan * 0.4;
    for (let step = 0; step < 6; step++) {
      const from = head - (length * step) / 6;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, from - length / 6, from);
      ctx.strokeStyle = `hsla(0, 0%, 100%, ${(0.8 * (1 - step / 6)).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, thickness * 0.45 * (1 - step / 8));
      ctx.stroke();
    }
  }

  drawParticles(scene, 0.7);
}
