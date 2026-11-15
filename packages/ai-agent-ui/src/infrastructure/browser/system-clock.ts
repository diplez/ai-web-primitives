import type { Clock } from "../../application/ports/clock.js";

/** Adaptador de `Clock` sobre `Date.now()` y `setInterval`. */
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  every(milliseconds: number, callback: () => void): () => void {
    const id = setInterval(callback, milliseconds);
    return () => clearInterval(id);
  }
}
