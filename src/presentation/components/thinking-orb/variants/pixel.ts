import { TAU, clamp01, drawHalo, type OrbScene } from "./variant-kit.js";

const CELLS = 13;

/**
 * `pixel`: matriz de LEDs circular. Un campo de ondas anima el brillo de cada punto:
 * al analizar lo recorre una fila iluminada, al buscar un barrido de radar y al generar
 * se vuelve un patrón denso y turbulento.
 */
export function drawPixel(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, motion, color } = scene;
  const t = motion.time;
  const cell = (r * 2.3) / CELLS;
  const speed = 0.5 + motion.speed * 1.6;
  const sweep = (t * 2.2) % TAU;
  const scanRow = Math.sin(t * 1.4);

  drawHalo(scene, 1.6, 0.6);

  for (let row = 0; row < CELLS; row++) {
    for (let column = 0; column < CELLS; column++) {
      const u = (column - (CELLS - 1) / 2) / ((CELLS - 1) / 2); // -1..1
      const v = (row - (CELLS - 1) / 2) / ((CELLS - 1) / 2);
      const distance = Math.hypot(u, v);
      if (distance > 1.02) continue;

      let level =
        0.35 +
        0.3 * Math.sin(u * 3.1 + t * speed) * Math.cos(v * 2.7 - t * speed * 0.8) +
        0.25 * motion.turbulence * Math.sin((u + v) * 7 + t * 5) +
        motion.energy * 3 * Math.sin(distance * 9 - t * speed * 3);

      // Fila de escaneo
      level += motion.scan * 0.9 * Math.max(0, 1 - Math.abs(v - scanRow) * 5);
      // Barrido de radar
      if (motion.seek > 0.01) {
        const angle = (Math.atan2(v, u) + TAU) % TAU;
        const behind = (sweep - angle + TAU) % TAU;
        level += motion.seek * 0.9 * Math.max(0, 1 - behind / 1.4);
      }
      // Reposo: puntos tenues
      level = clamp01(level * (0.75 + frame.glow * 0.8));

      const size = cell * (0.22 + 0.5 * level);
      const x = cx + u * r * 1.15;
      const y = cy + v * r * 1.15;
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, TAU);
      ctx.fillStyle = color(
        level > 0.6 ? frame.accentHue : frame.hue,
        46 + level * 40,
        0.38 + level * 0.62,
      );
      ctx.fill();
    }
  }
}
