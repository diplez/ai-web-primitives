import {
  orbOutline,
  orbParticles,
  orbScanRings,
  orbSonarWaves,
} from "../../../domain/orb/orb-geometry.js";
import {
  profileAt,
  transitionPulse,
  type OrbTransition,
} from "../../../domain/orb/orb-transition.js";
import type { OrbFrameDto } from "../../dtos/orb-frame-dto.js";

/** Desfase temporal de las estelas, en segundos. */
const TRAIL_LAG_SECONDS = 0.09;
const CORE_SEGMENTS = 48;
const CORE_SEED = 2.7;

/**
 * Compone un frame a partir de la transición vigente.
 * Con movimiento reducido se dibuja la pose de reposo del perfil destino: sin estelas,
 * sin onda y sin depender del reloj.
 */
export function composeOrbFrame(
  transition: OrbTransition,
  now: number,
  reducedMotion: boolean,
): OrbFrameDto {
  const time = reducedMotion ? 0 : now;
  const profile = reducedMotion ? transition.to : profileAt(transition, now);

  return {
    phase: transition.toPhase,
    outline: orbOutline(profile, time),
    core: orbOutline(
      { ...profile, energy: profile.energy * 2.2 + 0.08 },
      time * 1.3,
      CORE_SEGMENTS,
      CORE_SEED,
    ),
    coreRotation: profile.swirl * time,
    particles: orbParticles(profile, time),
    trails: reducedMotion ? [] : orbParticles(profile, time - TRAIL_LAG_SECONDS),
    rings: orbScanRings(profile, time),
    // Ondas en reposo: con movimiento reducido no se dibujan (serían anillos congelados).
    waves: reducedMotion ? [] : orbSonarWaves(profile, time),
    pulse: reducedMotion ? null : transitionPulse(transition, now),
    hue: profile.hue,
    accentHue: profile.accentHue,
    saturation: profile.saturation,
    glow: profile.glow,
  };
}
