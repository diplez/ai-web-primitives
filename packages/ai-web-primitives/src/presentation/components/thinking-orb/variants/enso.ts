import { TAU, drawParticles, hash, type OrbScene } from "./variant-kit.js";

const SEGMENTS = 120;
const BRISTLES = 4;

/**
 * `enso`: círculo zen trazado a pincel. Mientras el modelo trabaja, el trazo se abre y se
 * cierra como si se estuviera dibujando; en reposo y al terminar queda casi cerrado.
 * Las cerdas del pincel dejan un borde irregular y gotas de tinta.
 */
export function drawEnso(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const activity = Math.min(1, motion.scan + motion.seek + motion.emit + motion.orbit);
  const start = -Math.PI / 2 + 0.35 + t * 0.12 * activity;
  // Recorrido del trazo: 92 % en calma; oscila entre 45 % y 92 % al trabajar.
  const drawn = 0.92 - activity * 0.47 * (0.5 + 0.5 * Math.cos(t * (0.8 + motion.speed)));
  const sweep = TAU * drawn;
  const radius = r * 1.02 * (1 + motion.breath * Math.sin(t * 1.6));
  const maxWidth = r * (0.17 + motion.energy * 0.5);

  ctx.lineCap = "round";
  for (let bristle = 0; bristle < BRISTLES; bristle++) {
    const offset = (bristle - (BRISTLES - 1) / 2) * maxWidth * 0.18;
    for (let i = 0; i < SEGMENTS; i++) {
      const u = i / SEGMENTS;
      const a0 = start + sweep * u;
      const a1 = start + sweep * (u + 1 / SEGMENTS);
      // Presión del pincel: entra fuerte, se afina al final
      const pressure = Math.sin(Math.PI * (0.06 + 0.9 * u)) ** 0.6 * (1 - u * 0.5);
      const dry = hash(i * 7 + bristle * 131) < u * 0.35 ? 0.25 : 1;
      const texture = 1 + motion.turbulence * 0.3 * Math.sin(u * 40 + t * 3 + bristle);
      ctx.beginPath();
      ctx.arc(cx, cy, radius + offset, a0, a1 + 0.01);
      ctx.strokeStyle = color(
        bristle % 2 === 0 ? frame.hue : frame.accentHue,
        46 + bristle * 4,
        0.9 * dry,
      );
      ctx.lineWidth = Math.max(0.5, (maxWidth / BRISTLES) * 1.6 * pressure * texture);
      ctx.stroke();
    }
  }

  // Gotas de tinta al inicio del trazo
  for (let i = 0; i < 5; i++) {
    const angle = start - 0.1 - hash(i + 3) * 0.35;
    const distance = radius + (hash(i + 11) - 0.5) * maxWidth * 2.2;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * distance,
      cy + Math.sin(angle) * distance,
      r * 0.015 * (1 + hash(i + 5) * 2),
      0,
      TAU,
    );
    ctx.fillStyle = color(frame.hue, 46, 0.7);
    ctx.fill();
  }

  drawParticles(scene, 0.6, 52);
}
