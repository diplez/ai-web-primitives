import type { ThinkingPhase } from "../thinking/thinking-phase.js";
import {
  blendOrbProfiles,
  getOrbProfile,
  type OrbPalette,
  type OrbProfile,
} from "./orb-profile.js";

/** Duración por defecto de la transición entre fases, en segundos. */
export const ORB_TRANSITION_SECONDS = 0.9;

/** Transición inmutable entre dos perfiles. Los tiempos están en segundos. */
export interface OrbTransition {
  readonly from: OrbProfile;
  readonly to: OrbProfile;
  readonly toPhase: ThinkingPhase;
  readonly startedAt: number;
  readonly duration: number;
}

/** Onda expansiva que se emite al cambiar de fase. Radio relativo al radio del orbe. */
export interface OrbPulse {
  readonly radius: number;
  readonly alpha: number;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Progreso lineal de la transición (0–1). Una transición sin duración siempre está completa. */
export function transitionProgress(transition: OrbTransition, now: number): number {
  if (transition.duration <= 0) return 1;
  return Math.min(1, Math.max(0, (now - transition.startedAt) / transition.duration));
}

/** Perfil visible en el instante `now`. */
export function profileAt(transition: OrbTransition, now: number): OrbProfile {
  return blendOrbProfiles(
    transition.from,
    transition.to,
    easeInOutCubic(transitionProgress(transition, now)),
  );
}

/**
 * Inicia una transición hacia `phase` partiendo de lo que se ve ahora mismo, de modo que
 * un cambio a mitad de otra transición no produce saltos. Sin transición previa, el
 * orbe aparece directamente en la fase pedida.
 */
export function startOrbTransition(
  current: OrbTransition | null,
  phase: ThinkingPhase,
  palette: OrbPalette | undefined,
  now: number,
  duration: number = ORB_TRANSITION_SECONDS,
): OrbTransition {
  const to = getOrbProfile(phase, palette);
  return Object.freeze({
    from: current ? profileAt(current, now) : to,
    to,
    toPhase: phase,
    startedAt: now,
    duration: current ? Math.max(0, duration) : 0,
  });
}

/** Onda expansiva de la transición en curso, o `null` si no hay ninguna activa. */
export function transitionPulse(transition: OrbTransition, now: number): OrbPulse | null {
  const progress = transitionProgress(transition, now);
  if (transition.duration <= 0 || progress >= 1) return null;
  return Object.freeze({ radius: 1 + 0.75 * progress, alpha: 0.6 * (1 - progress) ** 2 });
}
