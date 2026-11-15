import type { Clock } from "../../application/ports/clock.js";

/** Adaptador de `Clock` sobre `performance.now()` y `setInterval`. */
export class SystemClock implements Clock {
  now(): number {
    return typeof performance === "undefined" ? Date.now() : performance.now();
  }

  every(milliseconds: number, callback: () => void): () => void {
    const id = setInterval(callback, milliseconds);
    return () => clearInterval(id);
  }
}
