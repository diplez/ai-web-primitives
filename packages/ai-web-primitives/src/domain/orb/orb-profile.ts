import type { ThinkingPhase } from "../thinking/thinking-phase.js";

/**
 * Parámetros numéricos que definen la personalidad visual del orbe en una fase.
 * Todos son interpolables, lo que permite transiciones continuas entre fases.
 */
export interface OrbProfile {
  /** Matiz principal, en grados (0–360). */
  readonly hue: number;
  /** Matiz de acento (núcleo, anillos, partículas), en grados. */
  readonly accentHue: number;
  /** Saturación, 0–100. */
  readonly saturation: number;
  /** Amplitud de la deformación de la superficie, relativa al radio (0–1). */
  readonly energy: number;
  /** Peso de los armónicos altos: superficie lisa (0) o turbulenta (1). */
  readonly turbulence: number;
  /** Velocidad angular base de la superficie, en rad/s. */
  readonly speed: number;
  /** Amplitud de la "respiración" (escala global), relativa al radio. */
  readonly breath: number;
  /** Intensidad del halo exterior (0–1). */
  readonly glow: number;
  /** Peso de los anillos de escaneo (fase de análisis). */
  readonly scan: number;
  /** Peso de las partículas en órbita. */
  readonly orbit: number;
  /** Peso de las partículas que salen y vuelven (fase de búsqueda). */
  readonly seek: number;
  /** Peso de las partículas emitidas hacia afuera (fase de generación). */
  readonly emit: number;
  /** Velocidad de giro del núcleo interno, en rad/s (el signo define el sentido). */
  readonly swirl: number;
}

/** Colores que el consumidor puede sobrescribir (p. ej. desde CSS custom properties). */
export interface OrbPalette {
  readonly hue?: number | undefined;
  readonly accentHue?: number | undefined;
  readonly saturation?: number | undefined;
}

export const ORB_PROFILES: Readonly<Record<ThinkingPhase, OrbProfile>> = Object.freeze({
  // Respiración: casi inmóvil, desaturado.
  idle: {
    hue: 226,
    accentHue: 205,
    saturation: 32,
    energy: 0.035,
    turbulence: 0.1,
    speed: 0.45,
    breath: 0.035,
    glow: 0.22,
    scan: 0,
    orbit: 0,
    seek: 0,
    emit: 0,
    swirl: 0.15,
  },
  // Escáner: anillos que barren la superficie, partículas lentas en órbita.
  analyzing: {
    hue: 192,
    accentHue: 168,
    saturation: 78,
    energy: 0.06,
    turbulence: 0.3,
    speed: 1.1,
    breath: 0.02,
    glow: 0.5,
    scan: 1,
    orbit: 0.35,
    seek: 0,
    emit: 0,
    swirl: 0.6,
  },
  // Sonar: partículas que salen en rayos y regresan con lo encontrado.
  searching: {
    hue: 36,
    accentHue: 16,
    saturation: 90,
    energy: 0.055,
    turbulence: 0.25,
    speed: 0.9,
    breath: 0.015,
    glow: 0.55,
    scan: 0.12,
    orbit: 0,
    seek: 1,
    emit: 0,
    swirl: -0.9,
  },
  // Forja: superficie turbulenta, núcleo veloz y tokens emitidos en espiral.
  generating: {
    hue: 276,
    accentHue: 318,
    saturation: 84,
    energy: 0.13,
    turbulence: 0.8,
    speed: 1.8,
    breath: 0.03,
    glow: 0.75,
    scan: 0,
    orbit: 0.2,
    seek: 0,
    emit: 1,
    swirl: 1.4,
  },
  // Calma: se asienta en verde.
  done: {
    hue: 152,
    accentHue: 118,
    saturation: 58,
    energy: 0.02,
    turbulence: 0.05,
    speed: 0.35,
    breath: 0.02,
    glow: 0.35,
    scan: 0,
    orbit: 0,
    seek: 0,
    emit: 0,
    swirl: 0.1,
  },
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeHue = (hue: number): number => ((hue % 360) + 360) % 360;

/** Perfil de una fase, con los colores del consumidor aplicados si los hay. */
export function getOrbProfile(phase: ThinkingPhase, palette?: OrbPalette): OrbProfile {
  const base = ORB_PROFILES[phase];
  if (!palette) return base;
  return Object.freeze({
    ...base,
    hue: palette.hue === undefined ? base.hue : normalizeHue(palette.hue),
    accentHue: palette.accentHue === undefined ? base.accentHue : normalizeHue(palette.accentHue),
    saturation:
      palette.saturation === undefined ? base.saturation : clamp(palette.saturation, 0, 100),
  });
}

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/** Interpola matices por el camino más corto del círculo cromático. */
export function lerpHue(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return normalizeHue(from + delta * t);
}

/** Mezcla dos perfiles: `t = 0` devuelve `from`, `t = 1` devuelve `to`. */
export function blendOrbProfiles(from: OrbProfile, to: OrbProfile, t: number): OrbProfile {
  const k = clamp(t, 0, 1);
  return Object.freeze({
    hue: lerpHue(from.hue, to.hue, k),
    accentHue: lerpHue(from.accentHue, to.accentHue, k),
    saturation: lerp(from.saturation, to.saturation, k),
    energy: lerp(from.energy, to.energy, k),
    turbulence: lerp(from.turbulence, to.turbulence, k),
    speed: lerp(from.speed, to.speed, k),
    breath: lerp(from.breath, to.breath, k),
    glow: lerp(from.glow, to.glow, k),
    scan: lerp(from.scan, to.scan, k),
    orbit: lerp(from.orbit, to.orbit, k),
    seek: lerp(from.seek, to.seek, k),
    emit: lerp(from.emit, to.emit, k),
    swirl: lerp(from.swirl, to.swirl, k),
  });
}
