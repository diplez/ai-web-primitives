import { TAU, drawHalo, drawParticles, drawSpecular, type OrbScene } from "./variant-kit.js";

const ORBITS = 3;
const TRAIL_STEPS = 7;

interface Electron {
  readonly x: number;
  readonly y: number;
  /** Profundidad: positiva delante del núcleo, negativa detrás. */
  readonly depth: number;
}

/**
 * `atom`: núcleo con electrones que recorren órbitas inclinadas en 3D y pasan por detrás
 * del núcleo. Al buscar, las órbitas se estiran; al generar, los electrones se aceleran.
 */
export function drawAtom(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const nucleus = r * (0.34 + motion.energy * 0.6);

  drawHalo(scene, 1.7, 0.8);

  const orbit = (index: number) => {
    const stretch = 1 + motion.seek * 0.32 * Math.abs(Math.sin(t * 1.1 + index * 1.7));
    return {
      rx: r * 1.32 * stretch,
      ry: r * 0.4 * stretch,
      rotation: (index * Math.PI) / ORBITS + t * 0.08 * (1 + motion.scan),
      speed: (1.4 + index * 0.45) * (0.4 + motion.speed),
    };
  };

  const electronAt = (index: number, angle: number): Electron => {
    const { rx, ry, rotation } = orbit(index);
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    return {
      x: cx + x * Math.cos(rotation) - y * Math.sin(rotation),
      y: cy + x * Math.sin(rotation) + y * Math.cos(rotation),
      depth: Math.sin(angle),
    };
  };

  // Trazos de las órbitas
  for (let i = 0; i < ORBITS; i++) {
    const { rx, ry, rotation } = orbit(i);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rotation, 0, TAU);
    ctx.strokeStyle = color(frame.accentHue, 66, 0.28);
    ctx.lineWidth = Math.max(1, r * 0.018);
    ctx.stroke();
  }

  const electrons = Array.from({ length: ORBITS }, (unused, index) => {
    const angle = t * orbit(index).speed + index * 2.1;
    return { index, angle, position: electronAt(index, angle) };
  });

  const drawElectron = (electron: (typeof electrons)[number]) => {
    // Estela: posiciones anteriores sobre la misma órbita
    for (let step = TRAIL_STEPS; step >= 1; step--) {
      const previous = electronAt(electron.index, electron.angle - step * 0.07);
      ctx.beginPath();
      ctx.arc(previous.x, previous.y, r * 0.045 * (1 - step / (TRAIL_STEPS + 2)), 0, TAU);
      ctx.fillStyle = color(frame.accentHue, 72, 0.32 * (1 - step / TRAIL_STEPS));
      ctx.fill();
    }
    const { x, y, depth } = electron.position;
    const size = r * (0.07 + 0.025 * depth);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.6);
    glow.addColorStop(0, "hsla(0, 0%, 100%, 0.95)");
    glow.addColorStop(0.3, color(frame.accentHue, 78, 0.85));
    glow.addColorStop(1, color(frame.accentHue, 70, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.6, 0, TAU);
    ctx.fill();
  };

  // Detrás del núcleo → núcleo → delante
  electrons.filter((electron) => electron.position.depth < 0).forEach(drawElectron);

  const body = ctx.createRadialGradient(
    cx - nucleus * 0.4,
    cy - nucleus * 0.4,
    0,
    cx,
    cy,
    nucleus * 1.15,
  );
  body.addColorStop(0, color(frame.accentHue, 84));
  body.addColorStop(0.45, color(frame.hue, 58));
  body.addColorStop(1, color(frame.hue, 30));
  const jitter = motion.turbulence * r * 0.025;
  ctx.beginPath();
  ctx.arc(cx + Math.sin(t * 23) * jitter, cy + Math.cos(t * 19) * jitter, nucleus, 0, TAU);
  ctx.fillStyle = body;
  ctx.fill();
  drawSpecular(scene, nucleus, 0.5);

  electrons.filter((electron) => electron.position.depth >= 0).forEach(drawElectron);
  drawParticles(scene, 0.7);
}
