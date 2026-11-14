import { TAU, drawHalo, drawParticles, type OrbScene } from "./variant-kit.js";

const RINGS = [
  { scale: 1.15, axis: 0, rate: 0.9, accent: false },
  { scale: 0.98, axis: Math.PI / 3, rate: -1.25, accent: true },
  { scale: 0.8, axis: (2 * Math.PI) / 3, rate: 1.6, accent: false },
] as const;

/**
 * `gyro`: giroscopio minimalista. Tres anillos finos giran en 3D alrededor de un punto de
 * luz; en reposo casi se alinean y al trabajar cada uno rota sobre su propio eje.
 */
export function drawGyro(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const activity = Math.min(1, motion.scan + motion.seek + motion.emit + motion.orbit + 0.15);

  drawHalo(scene, 1.6, 0.7);

  RINGS.forEach((ring, index) => {
    // Rotación 3D sobre el eje del anillo: el coseno achata la elipse.
    const spin = t * ring.rate * (0.35 + motion.speed) * activity + index;
    const tilt = Math.max(0.06, Math.abs(Math.cos(spin)));
    const expand = 1 + motion.seek * 0.18 * Math.sin(t * 2 + index);
    const radius = r * ring.scale * expand;
    const hue = ring.accent ? frame.accentHue : frame.hue;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ring.axis + t * 0.05);
    ctx.scale(1, tilt);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.strokeStyle = color(hue, 64, 0.55);
    ctx.lineWidth = Math.max(1, r * 0.028) / Math.max(tilt, 0.4);
    ctx.stroke();

    // Destello que recorre el anillo (más visible al analizar)
    const head = t * (1.5 + index * 0.4) * (0.5 + motion.speed);
    ctx.beginPath();
    ctx.arc(0, 0, radius, head, head + 0.9);
    ctx.strokeStyle = color(hue, 86, 0.35 + 0.6 * Math.max(motion.scan, motion.emit));
    ctx.lineWidth = Math.max(1.5, r * 0.05) / Math.max(tilt, 0.4);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  });

  // Punto de luz central
  const pulse = 1 + 0.15 * Math.sin(t * (2 + motion.speed * 3));
  const coreRadius = r * (0.2 + motion.energy * 0.8) * pulse;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 2.2);
  core.addColorStop(0, "hsla(0, 0%, 100%, 0.95)");
  core.addColorStop(0.3, color(frame.accentHue, 78, 0.9));
  core.addColorStop(1, color(frame.hue, 60, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius * 2.2, 0, TAU);
  ctx.fill();

  drawParticles(scene, 0.7);
}
