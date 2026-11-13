import type { MotionPreference } from "../../application/ports/motion-preference.js";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Adaptador de `MotionPreference` sobre la media query `prefers-reduced-motion`.
 * En entornos sin `matchMedia` (SSR, tests) asume que el movimiento está permitido.
 */
export class MediaQueryMotionPreference implements MotionPreference {
  prefersReducedMotion(): boolean {
    return this.mediaQuery()?.matches ?? false;
  }

  subscribe(onChange: (prefersReducedMotion: boolean) => void): () => void {
    const mediaQuery = this.mediaQuery();
    if (!mediaQuery) return () => {};
    const listener = (event: MediaQueryListEvent): void => onChange(event.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }

  private mediaQuery(): MediaQueryList | null {
    return typeof matchMedia === "function" ? matchMedia(REDUCED_MOTION_QUERY) : null;
  }
}
