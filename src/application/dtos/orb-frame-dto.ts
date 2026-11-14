import type { OrbParticle, OrbPoint, OrbRing, OrbWave } from "../../domain/orb/orb-geometry.js";
import type { OrbPulse } from "../../domain/orb/orb-transition.js";
import type { ThinkingPhase } from "../../domain/thinking/thinking-phase.js";

/**
 * Todo lo necesario para dibujar un frame del orbe. Coordenadas normalizadas:
 * radio base = 1, centro = (0, 0). La presentación solo escala y pinta.
 */
export interface OrbFrameDto {
  readonly phase: ThinkingPhase;
  readonly outline: readonly OrbPoint[];
  /** Figura del núcleo interno (sin rotar). */
  readonly core: readonly OrbPoint[];
  readonly coreRotation: number;
  readonly particles: readonly OrbParticle[];
  /** Posición de cada partícula un instante antes: permite dibujar estelas. */
  readonly trails: readonly OrbParticle[];
  readonly rings: readonly OrbRing[];
  /** Ondas de sonar (fase de búsqueda). */
  readonly waves: readonly OrbWave[];
  readonly pulse: OrbPulse | null;
  readonly hue: number;
  readonly accentHue: number;
  readonly saturation: number;
  readonly glow: number;
  /**
   * Parámetros de movimiento interpolados de la fase y reloj de la animación. Permiten que
   * cada diseño (`variant`) interprete el mismo estado a su manera, con transiciones suaves.
   */
  readonly motion: OrbMotion;
}

export interface OrbMotion {
  /** Segundos de animación (0 con movimiento reducido). */
  readonly time: number;
  readonly energy: number;
  readonly turbulence: number;
  readonly speed: number;
  readonly breath: number;
  readonly scan: number;
  readonly orbit: number;
  readonly seek: number;
  readonly emit: number;
  readonly swirl: number;
}
