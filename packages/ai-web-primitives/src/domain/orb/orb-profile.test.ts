import { THINKING_PHASES } from "../thinking/thinking-phase.js";
import { ORB_PROFILES, blendOrbProfiles, getOrbProfile, lerpHue } from "./orb-profile.js";
import { ORB_VARIANTS, toOrbVariant } from "./orb-variant.js";

describe("orb-profile", () => {
  it("define un perfil distinto para cada fase", () => {
    const signatures = THINKING_PHASES.map((phase) => JSON.stringify(ORB_PROFILES[phase]));
    expect(new Set(signatures).size).toBe(THINKING_PHASES.length);
  });

  it("cada fase activa tiene su comportamiento característico", () => {
    expect(ORB_PROFILES.analyzing.scan).toBe(1);
    expect(ORB_PROFILES.searching.seek).toBe(1);
    expect(ORB_PROFILES.generating.emit).toBe(1);
    expect(ORB_PROFILES.generating.turbulence).toBeGreaterThan(ORB_PROFILES.idle.turbulence);
  });

  it("aplica los colores del consumidor y los normaliza", () => {
    const profile = getOrbProfile("idle", { hue: 370, accentHue: -30, saturation: 150 });
    expect(profile.hue).toBe(10);
    expect(profile.accentHue).toBe(330);
    expect(profile.saturation).toBe(100);
    expect(profile.energy).toBe(ORB_PROFILES.idle.energy);
  });

  it("devuelve el perfil base sin paleta", () => {
    expect(getOrbProfile("done")).toBe(ORB_PROFILES.done);
  });

  it("interpola matices por el camino más corto", () => {
    expect(lerpHue(350, 10, 0.5)).toBeCloseTo(0);
    expect(lerpHue(10, 350, 0.5)).toBeCloseTo(0);
    expect(lerpHue(100, 200, 0.5)).toBeCloseTo(150);
  });

  it("la mezcla respeta los extremos y acota t", () => {
    const { idle, generating } = ORB_PROFILES;
    expect(blendOrbProfiles(idle, generating, 0)).toEqual(idle);
    expect(blendOrbProfiles(idle, generating, 1)).toEqual(generating);
    expect(blendOrbProfiles(idle, generating, 5)).toEqual(generating);
    const middle = blendOrbProfiles(idle, generating, 0.5);
    expect(middle.energy).toBeGreaterThan(idle.energy);
    expect(middle.energy).toBeLessThan(generating.energy);
  });
});

describe("orb-variant", () => {
  it("normaliza el diseño y ofrece al menos 10", () => {
    expect(ORB_VARIANTS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ORB_VARIANTS).size).toBe(ORB_VARIANTS.length);
    expect(toOrbVariant("nebula")).toBe("nebula");
    expect(toOrbVariant("nope")).toBe("sphere");
  });
});
