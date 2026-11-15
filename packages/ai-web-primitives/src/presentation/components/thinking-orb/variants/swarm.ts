import { TAU, drawHalo, fract, hash, type OrbScene } from "./variant-kit.js";

const POINTS = 110;

interface Projected {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly alpha: number;
  readonly hueMix: number;
}

// Puntos repartidos uniformemente sobre una esfera (espiral de Fibonacci), calculados una vez.
const SPHERE = Array.from({ length: POINTS }, (unused, i) => {
  const y = 1 - (2 * (i + 0.5)) / POINTS;
  const ring = Math.sqrt(1 - y * y);
  const theta = i * 2.399963229728653;
  return { x: Math.cos(theta) * ring, y, z: Math.sin(theta) * ring, latitude: Math.asin(y) };
});

/**
 * `swarm`: enjambre de partículas que forma una esfera 3D en rotación. Al buscar, oleadas
 * de puntos salen disparadas; al generar, algunos se desprenden en espiral; al terminar,
 * el enjambre se compacta.
 */
export function drawSwarm(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const yaw = t * (0.15 + motion.speed * 0.35);
  const pitch = 0.45 + 0.2 * Math.sin(t * 0.3);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  drawHalo(scene, 1.6, 0.8);

  const projected: Projected[] = SPHERE.map((point, i) => {
    const random = hash(i + 13);
    let radius =
      1 +
      motion.energy * 1.8 * Math.sin(point.latitude * 3 + t * (1 + motion.speed * 2) + i * 0.15);
    radius *= 1 + motion.breath * Math.sin(t * 1.6);
    radius *= 1 + motion.seek * 0.55 * Math.max(0, Math.sin(t * 1.7 + random * 6)) ** 4;
    let alpha = 1;
    if (random < 0.3) {
      const cycle = fract(t * 0.45 + random * 3);
      radius *= 1 + motion.emit * cycle * 0.75;
      alpha = 1 - motion.emit * cycle;
    }
    // Rotación (yaw alrededor de Y, luego pitch alrededor de X)
    const x1 = point.x * cosYaw + point.z * sinYaw;
    const z1 = -point.x * sinYaw + point.z * cosYaw;
    const y2 = point.y * cosPitch - z1 * sinPitch;
    const z2 = point.y * sinPitch + z1 * cosPitch;
    return {
      x: cx + x1 * radius * r,
      y: cy + y2 * radius * r,
      depth: z2,
      alpha,
      hueMix: (z2 + 1) / 2,
    };
  });

  projected.sort((a, b) => a.depth - b.depth);
  for (const point of projected) {
    const near = (point.depth + 1) / 2; // 0 lejos, 1 cerca
    const hue = point.hueMix > 0.5 ? frame.accentHue : frame.hue;
    ctx.beginPath();
    ctx.arc(point.x, point.y, r * (0.025 + 0.04 * near), 0, TAU);
    ctx.fillStyle = color(hue, 48 + near * 34, (0.25 + 0.75 * near) * point.alpha);
    ctx.fill();
  }
}
