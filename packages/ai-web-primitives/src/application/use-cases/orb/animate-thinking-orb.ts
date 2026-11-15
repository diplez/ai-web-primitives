import type { OrbPalette } from "../../../domain/orb/orb-profile.js";
import { startOrbTransition, type OrbTransition } from "../../../domain/orb/orb-transition.js";
import { toThinkingPhase } from "../../../domain/thinking/thinking-phase.js";
import type { OrbFrameDto } from "../../dtos/orb-frame-dto.js";
import type { FrameScheduler } from "../../ports/frame-scheduler.js";
import type { MotionPreference } from "../../ports/motion-preference.js";
import { composeOrbFrame } from "./compose-orb-frame.js";

export interface AnimateThinkingOrbInput {
  /** Fase inicial (valor crudo; se normaliza en el dominio). */
  readonly phase: unknown;
  readonly palette?: OrbPalette | undefined;
  /** Recibe cada frame listo para dibujar. */
  readonly onFrame: (frame: OrbFrameDto) => void;
}

/** Control de una animación en curso. */
export interface OrbAnimationHandle {
  /** Transiciona suavemente hacia otra fase (y opcionalmente otra paleta). */
  setPhase(phase: unknown, palette?: OrbPalette): void;
  /** Pausa el bucle cuando el orbe no es visible y lo reanuda al volver. */
  setVisible(visible: boolean): void;
  /** Detiene la animación y libera las suscripciones. */
  stop(): void;
}

/**
 * Caso de uso: anima un orbe de pensamiento.
 *
 * - Con movimiento permitido y el orbe visible, emite un frame por cada tick del scheduler.
 * - Con movimiento reducido no usa el scheduler: emite un único frame en reposo por cada cambio.
 * - Reacciona en vivo a cambios de la preferencia de movimiento.
 */
export class AnimateThinkingOrb {
  constructor(
    private readonly frameScheduler: FrameScheduler,
    private readonly motionPreference: MotionPreference,
  ) {}

  execute(input: AnimateThinkingOrbInput): OrbAnimationHandle {
    let reducedMotion = this.motionPreference.prefersReducedMotion();
    let visible = true;
    let stopped = false;
    let now = 0;
    let cancelFrames: (() => void) | null = null;
    let transition: OrbTransition = startOrbTransition(
      null,
      toThinkingPhase(input.phase),
      input.palette,
      now,
    );

    const emit = (): void => input.onFrame(composeOrbFrame(transition, now, reducedMotion));

    const syncLoop = (): void => {
      const shouldRun = !stopped && visible && !reducedMotion;
      if (shouldRun && !cancelFrames) {
        cancelFrames = this.frameScheduler.start((nowSeconds) => {
          now = nowSeconds;
          emit();
        });
      } else if (!shouldRun && cancelFrames) {
        cancelFrames();
        cancelFrames = null;
      }
    };

    const unsubscribe = this.motionPreference.subscribe((prefersReducedMotion) => {
      reducedMotion = prefersReducedMotion;
      syncLoop();
      if (!stopped) emit();
    });

    syncLoop();
    emit();

    return {
      setPhase: (phase, palette) => {
        if (stopped) return;
        transition = startOrbTransition(
          transition,
          toThinkingPhase(phase),
          palette,
          now,
          reducedMotion ? 0 : undefined,
        );
        // Sin bucle activo nadie más va a pintar: se emite el frame aquí.
        if (!cancelFrames) emit();
      },
      setVisible: (isVisible) => {
        visible = isVisible;
        syncLoop();
      },
      stop: () => {
        if (stopped) return;
        stopped = true;
        syncLoop();
        unsubscribe();
      },
    };
  }
}
