import type { Clock } from "../../application/ports/clock.js";
import type { MotionPreference } from "../../application/ports/motion-preference.js";

/** Adaptador de `Clock` sobre `setTimeout`. */
export class TimeoutClock implements Clock {
  after(milliseconds: number, callback: () => void): () => void {
    const id = setTimeout(callback, milliseconds);
    return () => clearTimeout(id);
  }
}

/** Adaptador de `MotionPreference` sobre `matchMedia`. Sin `matchMedia`, asume movimiento normal. */
export class MediaQueryMotionPreference implements MotionPreference {
  prefersReducedMotion(): boolean {
    return (
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }
}
