import {
  createCountdown,
  pauseCountdown,
  remainingAt,
  resumeCountdown,
  type Countdown,
} from "../../../domain/approval/approval.js";
import type { Clock } from "../../ports/clock.js";

export interface ApprovalCountdownTick {
  readonly remainingMs: number;
  /** Fracción restante (1 → 0), para dibujar la barra. */
  readonly fraction: number;
  /** Segundos restantes redondeados hacia arriba, para el texto. */
  readonly remainingSeconds: number;
  readonly paused: boolean;
}

export interface RunApprovalCountdownInput {
  readonly seconds: number;
  readonly onTick: (tick: ApprovalCountdownTick) => void;
  readonly onExpire: () => void;
}

export interface ApprovalCountdownHandle {
  pause(): void;
  resume(): void;
  cancel(): void;
}

const TICK_MS = 100;

/**
 * Caso de uso: cuenta regresiva de una solicitud de aprobación.
 * Se puede pausar (p. ej. mientras la persona lee o tiene el foco en la tarjeta:
 * WCAG 2.2.1 "Tiempo ajustable") y reanudar sin perder tiempo.
 */
export class RunApprovalCountdown {
  constructor(private readonly clock: Clock) {}

  execute(input: RunApprovalCountdownInput): ApprovalCountdownHandle {
    const durationMs = input.seconds * 1000;
    if (durationMs <= 0) return { pause: () => {}, resume: () => {}, cancel: () => {} };

    let countdown: Countdown = resumeCountdown(createCountdown(durationMs), this.clock.now());
    let finished = false;

    const emit = (): number => {
      const remainingMs = remainingAt(countdown, this.clock.now());
      input.onTick({
        remainingMs,
        fraction: remainingMs / durationMs,
        remainingSeconds: Math.ceil(remainingMs / 1000),
        paused: countdown.runningSince === null,
      });
      return remainingMs;
    };

    const stopTicking = this.clock.every(TICK_MS, () => {
      if (finished || countdown.runningSince === null) return;
      if (emit() <= 0) {
        finish();
        input.onExpire();
      }
    });

    const finish = (): void => {
      finished = true;
      stopTicking();
    };

    emit();

    return {
      pause: () => {
        if (finished) return;
        countdown = pauseCountdown(countdown, this.clock.now());
        emit();
      },
      resume: () => {
        if (finished) return;
        countdown = resumeCountdown(countdown, this.clock.now());
        emit();
      },
      cancel: () => {
        if (!finished) finish();
      },
    };
  }
}
