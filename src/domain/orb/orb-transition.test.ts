import { ORB_PROFILES } from "./orb-profile.js";
import {
  easeInOutCubic,
  profileAt,
  startOrbTransition,
  transitionProgress,
  transitionPulse,
} from "./orb-transition.js";

describe("orb-transition", () => {
  it("la primera transición aparece directamente en la fase pedida", () => {
    const transition = startOrbTransition(null, "searching", undefined, 10);
    expect(transition.duration).toBe(0);
    expect(transitionProgress(transition, 10)).toBe(1);
    expect(profileAt(transition, 10)).toEqual(ORB_PROFILES.searching);
    expect(transitionPulse(transition, 10)).toBeNull();
  });

  it("interpola entre fases y termina en el perfil destino", () => {
    const first = startOrbTransition(null, "idle", undefined, 0);
    const second = startOrbTransition(first, "generating", undefined, 1, 1);

    expect(transitionProgress(second, 1.5)).toBeCloseTo(0.5);
    const middle = profileAt(second, 1.5);
    expect(middle.energy).toBeGreaterThan(ORB_PROFILES.idle.energy);
    expect(middle.energy).toBeLessThan(ORB_PROFILES.generating.energy);
    expect(profileAt(second, 99)).toEqual(ORB_PROFILES.generating);
  });

  it("un cambio a mitad de transición parte de lo visible, sin saltos", () => {
    const first = startOrbTransition(null, "idle", undefined, 0);
    const toGenerating = startOrbTransition(first, "generating", undefined, 0, 1);
    const visible = profileAt(toGenerating, 0.5);
    const toDone = startOrbTransition(toGenerating, "done", undefined, 0.5, 1);
    expect(toDone.from).toEqual(visible);
  });

  it("emite una onda que se expande y se apaga durante la transición", () => {
    const first = startOrbTransition(null, "idle", undefined, 0);
    const second = startOrbTransition(first, "done", undefined, 0, 1);
    const early = transitionPulse(second, 0.1)!;
    const late = transitionPulse(second, 0.8)!;
    expect(late.radius).toBeGreaterThan(early.radius);
    expect(late.alpha).toBeLessThan(early.alpha);
    expect(transitionPulse(second, 1)).toBeNull();
  });

  it("la curva de suavizado va de 0 a 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});
