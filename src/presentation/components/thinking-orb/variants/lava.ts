import {
  TAU,
  drawHalo,
  drawParticles,
  drawSpecular,
  fract,
  hash,
  type OrbScene,
} from "./variant-kit.js";

const BLOBS = 7;

/**
 * `lava`: lámpara de lava esférica. Burbujas cálidas suben dentro del vidrio, se estiran
 * mientras aceleran y se funden entre sí. La velocidad y el tamaño siguen a la fase.
 */
export function drawLava(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const radius = r * (1 + motion.breath * Math.sin(t * 1.6));

  drawHalo(scene, 1.75, 0.9);

  // Vidrio
  const glass = ctx.createRadialGradient(cx, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
  glass.addColorStop(0, color(frame.hue, 34, 0.95, 0.8));
  glass.addColorStop(1, color(frame.hue, 16, 0.98, 0.8));
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.fillStyle = glass;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.clip();

  // Burbujas: suben de abajo hacia arriba en ciclos desfasados
  ctx.globalCompositeOperation = "lighter";
  const rise = 0.06 + motion.speed * 0.11;
  for (let i = 0; i < BLOBS; i++) {
    const random = hash(i + 7);
    const cycle = fract(t * rise * (0.7 + random * 0.6) + random);
    const y = cy + radius * (1.35 - cycle * 2.7);
    const x = cx + radius * (random - 0.5) * 1.1 + Math.sin(t * 0.8 + i * 1.7) * radius * 0.15;
    const size = radius * (0.2 + 0.2 * hash(i + 21)) * (1 + motion.energy * 2.5);
    // Más rápido en el centro del recorrido → más estirada
    const stretch = 1 + 0.35 * Math.sin(Math.PI * cycle) * (0.4 + motion.speed);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * stretch);
    gradient.addColorStop(0, color(frame.accentHue, 70, 0.95));
    gradient.addColorStop(0.55, color(frame.hue + 15, 55, 0.6));
    gradient.addColorStop(1, color(frame.hue, 45, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, size / Math.sqrt(stretch), size * stretch, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  drawSpecular(scene, radius, 0.45);
  ctx.restore();

  // Borde del vidrio
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.strokeStyle = color(frame.accentHue, 78, 0.5);
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.stroke();

  drawParticles(scene, 0.8);
}
