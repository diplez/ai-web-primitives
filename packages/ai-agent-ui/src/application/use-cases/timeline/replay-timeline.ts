import type { Clock } from "../../ports/clock.js";

export interface ReplayTimelineInput {
  /** Índice desde el que empieza (si ya está en el último, vuelve a empezar desde 0). */
  readonly from: number;
  readonly count: number;
  /** Milisegundos entre eventos. */
  readonly intervalMs: number;
  /** Se llama con cada índice nuevo. */
  readonly onStep: (index: number) => void;
  /** Se llama al llegar al último evento. */
  readonly onEnd: () => void;
}

/** Intervalo mínimo entre pasos de la repetición, para que siga siendo legible. */
const MIN_INTERVAL_MS = 120;

/**
 * Caso de uso: recorre los eventos uno a uno, como reproducir una grabación.
 * Devuelve una función que detiene la repetición.
 */
export class ReplayTimeline {
  constructor(private readonly clock: Clock) {}

  execute(input: ReplayTimelineInput): () => void {
    if (input.count === 0) {
      input.onEnd();
      return () => {};
    }
    let index = input.from >= input.count - 1 ? 0 : Math.max(0, input.from);
    input.onStep(index);
    const stop = this.clock.every(Math.max(MIN_INTERVAL_MS, input.intervalMs), () => {
      index += 1;
      if (index >= input.count - 1) {
        stop();
        input.onStep(input.count - 1);
        input.onEnd();
        return;
      }
      input.onStep(index);
    });
    return stop;
  }
}
