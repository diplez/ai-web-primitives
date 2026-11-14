import {
  drawHalo,
  drawParticles,
  drawSpecular,
  strokeScanRing,
  tracePath,
  type OrbScene,
} from "./variant-kit.js";

/** `sphere`: esfera brillante con núcleo que gira, anillos de escaneo y partículas. */
export function drawSphere(scene: OrbScene): void {
  const { ctx, cx, cy, r, frame, color } = scene;

  drawHalo(scene);
  for (const ring of frame.rings) {
    strokeScanRing(scene, ring, "back", color(frame.accentHue, 70, ring.alpha * 0.45));
  }

  // Cuerpo
  const body = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, 0, cx, cy, r * 1.2);
  body.addColorStop(0, color(frame.accentHue, 86));
  body.addColorStop(0.3, color(frame.hue, 64));
  body.addColorStop(0.75, color(frame.hue, 42));
  body.addColorStop(1, color(frame.hue, 26));
  tracePath(ctx, frame.outline, cx, cy, r);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  tracePath(ctx, frame.outline, cx, cy, r);
  ctx.clip();

  // Núcleo: dos lóbulos que giran dentro del cuerpo
  ctx.globalCompositeOperation = "screen";
  const lobes = [
    { angle: 0, scale: 0.7, offset: 0.22, hue: frame.accentHue, light: 78, alpha: 0.95 },
    { angle: Math.PI, scale: 0.52, offset: 0.26, hue: frame.hue + 28, light: 76, alpha: 0.7 },
  ];
  for (const lobe of lobes) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(frame.coreRotation + lobe.angle);
    ctx.translate(r * lobe.offset, 0);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * lobe.scale);
    gradient.addColorStop(0, color(lobe.hue, lobe.light, lobe.alpha));
    gradient.addColorStop(1, color(lobe.hue, 60, 0));
    tracePath(ctx, frame.core, 0, 0, r * lobe.scale);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  // Sombra propia (volumen)
  ctx.globalCompositeOperation = "source-over";
  const shade = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  shade.addColorStop(0.45, color(frame.hue, 15, 0));
  shade.addColorStop(1, color(frame.hue, 12, 0.4));
  ctx.fillStyle = shade;
  ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);
  drawSpecular(scene, r);
  ctx.restore();

  // Borde iluminado
  tracePath(ctx, frame.outline, cx, cy, r);
  ctx.strokeStyle = color(frame.accentHue, 80, 0.45);
  ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.stroke();

  for (const ring of frame.rings) {
    strokeScanRing(scene, ring, "front", color(frame.accentHue, 74, ring.alpha));
  }
  drawParticles(scene);

  // Evita que una sombra o composición quede activa para el próximo frame.
  ctx.globalCompositeOperation = "source-over";
}
