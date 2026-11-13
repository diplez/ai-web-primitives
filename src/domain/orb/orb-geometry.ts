import type { OrbProfile } from "./orb-profile.js";

// Toda la geometría está normalizada: el radio base del orbe vale 1 y el centro es (0, 0).
// Las funciones son puras y deterministas: el mismo perfil y el mismo tiempo producen
// exactamente la misma figura (no hay estado ni azar).

export interface OrbPoint {
  readonly x: number;
  readonly y: number;
}

export interface OrbParticle {
  readonly x: number;
  readonly y: number;
  /** Radio de la partícula, relativo al radio del orbe. */
  readonly size: number;
  readonly alpha: number;
}

export interface OrbRing {
  /** Achatamiento vertical de la elipse (0 = línea, 1 = círculo). */
  readonly tilt: number;
  readonly rotation: number;
  readonly sweepStart: number;
  readonly sweepLength: number;
  readonly alpha: number;
}

export const ORB_OUTLINE_SEGMENTS = 72;
export const ORB_PARTICLE_COUNT = 18;

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = 2.399963229728653;

/** Armónicos de la superficie: los dos primeros siempre activos, el resto según `turbulence`. */
const HARMONICS = [
  { order: 2, amplitude: 1, velocity: 1, offset: 0 },
  { order: 3, amplitude: 0.7, velocity: -1.3, offset: 1.7 },
  { order: 5, amplitude: 0.45, velocity: 1.9, offset: 4.1 },
  { order: 7, amplitude: 0.3, velocity: -2.6, offset: 2.3 },
] as const;
const HARMONIC_NORM = HARMONICS.reduce((sum, harmonic) => sum + harmonic.amplitude, 0);

/** Pseudoaleatorio determinista en [0, 1) a partir de un entero. */
export function hash01(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const fract = (value: number): number => value - Math.floor(value);

/**
 * Contorno del orbe en el instante `time`. El radio en cada ángulo es
 * `escala · (1 + energy · ruido)`, con el ruido acotado a [-1, 1].
 * `seed` desfasa los armónicos para generar figuras hermanas (p. ej. el núcleo).
 */
export function orbOutline(
  profile: OrbProfile,
  time: number,
  segments: number = ORB_OUTLINE_SEGMENTS,
  seed = 0,
): OrbPoint[] {
  const scale = 1 + profile.breath * Math.sin(time * 1.6);
  const points: OrbPoint[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * TAU;
    let noise = 0;
    for (const harmonic of HARMONICS) {
      const weight = harmonic.order <= 3 ? 1 : profile.turbulence;
      noise +=
        harmonic.amplitude *
        weight *
        Math.sin(
          harmonic.order * angle +
            harmonic.velocity * profile.speed * time +
            harmonic.offset +
            seed,
        );
    }
    const radius = scale * (1 + (profile.energy * noise) / HARMONIC_NORM);
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }

  return points;
}

interface ParticleState {
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

/** Órbita elíptica inclinada alrededor del orbe. */
function orbitState(index: number, random: number, time: number): ParticleState {
  const direction = index % 2 === 0 ? 1 : -1;
  const angle = index * GOLDEN_ANGLE + time * (0.55 + 0.45 * random) * direction;
  const radius = 1.32 + 0.12 * Math.sin(time * 0.9 + index);
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * 0.38;
  const tilt = -0.42;
  return {
    x: x * Math.cos(tilt) - y * Math.sin(tilt),
    y: x * Math.sin(tilt) + y * Math.cos(tilt),
    alpha: 0.55 + 0.45 * Math.sin(angle) ** 2,
  };
}

/** Rayo de sonar: sale desde la superficie y vuelve, con brillo máximo en el punto más lejano. */
function seekState(index: number, random: number, time: number): ParticleState {
  const cycle = fract(time * 0.42 + random);
  const reach = Math.sin(Math.PI * cycle);
  const angle = index * GOLDEN_ANGLE + 0.25 * Math.sin(time * 0.6 + index);
  const radius = 1.02 + 0.78 * reach * (0.6 + 0.4 * random);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, alpha: reach };
}

/** Token emitido: nace en la superficie y se aleja en espiral mientras se desvanece. */
function emitState(index: number, random: number, time: number): ParticleState {
  const cycle = fract(time * 0.58 + random);
  const angle = index * GOLDEN_ANGLE + cycle * 0.9;
  const radius = 0.96 + 0.84 * cycle;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, alpha: (1 - cycle) ** 1.5 };
}

/**
 * Partículas del orbe. Cada una mezcla tres comportamientos (órbita, búsqueda, emisión)
 * ponderados por el perfil, así que durante una transición las trayectorias se transforman
 * de un comportamiento al otro en lugar de cortarse.
 */
export function orbParticles(
  profile: OrbProfile,
  time: number,
  count: number = ORB_PARTICLE_COUNT,
): OrbParticle[] {
  const total = profile.orbit + profile.seek + profile.emit;
  const particles: OrbParticle[] = [];

  for (let i = 0; i < count; i++) {
    const random = hash01(i + 1);
    const size = 0.035 + 0.03 * random;

    if (total < 0.001) {
      particles.push({ x: 0, y: 0, size, alpha: 0 });
      continue;
    }

    const orbit = orbitState(i, random, time);
    const seek = seekState(i, random, time);
    const emit = emitState(i, random, time);
    const mix = (pick: (state: ParticleState) => number): number =>
      (profile.orbit * pick(orbit) + profile.seek * pick(seek) + profile.emit * pick(emit)) / total;

    particles.push({
      x: mix((state) => state.x),
      y: mix((state) => state.y),
      size,
      alpha: mix((state) => state.alpha) * Math.min(1, total),
    });
  }

  return particles;
}

/** Anillos de escaneo: elipses inclinadas que giran y barren un arco del orbe. */
export function orbScanRings(profile: OrbProfile, time: number): OrbRing[] {
  if (profile.scan <= 0.01) return [];
  return [0, 1, 2].map((index) => ({
    tilt: 0.22 + 0.18 * Math.sin(time * 0.8 + index * 2.1),
    rotation: (index * Math.PI) / 3 + time * 0.35 * profile.speed,
    sweepStart: time * (1.4 + index * 0.45),
    sweepLength: Math.PI * 0.85,
    alpha: profile.scan * (0.6 - index * 0.14),
  }));
}

export interface OrbWave {
  readonly radius: number;
  readonly alpha: number;
}

/** Periodo de un "ping" de sonar, en segundos. */
const SONAR_PERIOD_SECONDS = 1.7;
const SONAR_WAVES = 2;

/**
 * Ondas de sonar: círculos que nacen en la superficie y se expanden mientras se apagan,
 * escalonados en el tiempo. Su intensidad depende del peso de búsqueda (`seek`).
 */
export function orbSonarWaves(profile: OrbProfile, time: number): OrbWave[] {
  if (profile.seek <= 0.01) return [];
  return [...Array(SONAR_WAVES).keys()].map((index) => {
    const cycle = fract(time / SONAR_PERIOD_SECONDS + index / SONAR_WAVES);
    return { radius: 1 + 0.8 * cycle, alpha: profile.seek * 0.5 * (1 - cycle) ** 2 };
  });
}
