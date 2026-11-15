import { MediaQueryMotionPreference } from "./media-query-motion-preference.js";

describe("MediaQueryMotionPreference", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sin matchMedia asume que el movimiento está permitido", () => {
    vi.stubGlobal("matchMedia", undefined);
    const preference = new MediaQueryMotionPreference();
    expect(preference.prefersReducedMotion()).toBe(false);
    expect(() => preference.subscribe(() => {})()).not.toThrow();
  });

  it("lee la media query y notifica cambios", () => {
    const listeners = new Set<(event: { matches: boolean }) => void>();
    const mediaQuery = {
      matches: true,
      addEventListener: (type: string, listener: (event: { matches: boolean }) => void) =>
        listeners.add(listener),
      removeEventListener: (type: string, listener: (event: { matches: boolean }) => void) =>
        listeners.delete(listener),
    };
    vi.stubGlobal("matchMedia", (query: string) => {
      expect(query).toBe("(prefers-reduced-motion: reduce)");
      return mediaQuery;
    });

    const preference = new MediaQueryMotionPreference();
    expect(preference.prefersReducedMotion()).toBe(true);

    const received: boolean[] = [];
    const unsubscribe = preference.subscribe((reduced) => received.push(reduced));
    for (const listener of listeners) listener({ matches: false });
    expect(received).toEqual([false]);

    unsubscribe();
    expect(listeners.size).toBe(0);
  });
});
