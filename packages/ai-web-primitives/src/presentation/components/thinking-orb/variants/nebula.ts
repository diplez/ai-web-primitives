import { GOLDEN_ANGLE, TAU, drawHalo, drawParticles, hash, type OrbScene } from "./variant-kit.js";

const PUFFS = 8;
const STARS = 16;

/**
 * `nebula`: nube gaseosa de dos colores que deriva y se agita con la energía de la fase,
 * con estrellas que titilan alrededor y un núcleo luminoso.
 */
export function drawNebula(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;

  drawHalo(scene, 2, 1.2);

  // Nubes: cada una gira y "respira" a su ritmo; la energía las separa y deforma.
  for (let i = 0; i < PUFFS; i++) {
    const random = hash(i + 3);
    const direction = i % 2 === 0 ? 1 : -1;
    const angle = i * GOLDEN_ANGLE + t * (0.12 + motion.speed * 0.18) * direction;
    const distance = r * (0.18 + 0.32 * random) * (1 + motion.energy * 3 * Math.sin(t * 0.9 + i));
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance * 0.85;
    const size = r * (0.55 + 0.35 * random) * (1 + 0.12 * Math.sin(t * 1.3 + i * 2));
    const hue = i % 3 === 0 ? frame.accentHue : frame.hue + (random - 0.5) * 30;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, color(hue, 66, 0.42 + motion.turbulence * 0.2));
    gradient.addColorStop(0.55, color(hue, 52, 0.16));
    gradient.addColorStop(1, color(hue, 45, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }

  // Núcleo
  const coreSize = r * (0.32 + motion.energy * 1.2 + 0.03 * Math.sin(t * 2.4));
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
  core.addColorStop(0, "hsla(0, 0%, 100%, 0.9)");
  core.addColorStop(0.35, color(frame.accentHue, 80, 0.7));
  core.addColorStop(1, color(frame.accentHue, 70, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreSize, 0, TAU);
  ctx.fill();

  // Estrellas: titilan más rápido cuanto más activa la fase.
  for (let i = 0; i < STARS; i++) {
    const random = hash(i + 40);
    const angle = i * GOLDEN_ANGLE * 1.7 + t * 0.05;
    const distance = r * (0.5 + 1.15 * hash(i + 90));
    const twinkle = Math.sin(t * (1.2 + motion.speed * 2) + i * 1.9) ** 2;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * distance,
      cy + Math.sin(angle) * distance,
      r * (0.012 + 0.018 * random),
      0,
      TAU,
    );
    ctx.fillStyle = color(frame.accentHue, 88, 0.25 + 0.65 * twinkle * (0.4 + frame.glow));
    ctx.fill();
  }

  drawParticles(scene, 0.8, 84);
}
