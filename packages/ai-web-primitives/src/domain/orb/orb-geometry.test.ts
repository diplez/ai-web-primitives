import {
  ORB_OUTLINE_SEGMENTS,
  ORB_PARTICLE_COUNT,
  hash01,
  orbOutline,
  orbParticles,
  orbScanRings,
  orbSonarWaves,
} from "./orb-geometry.js";
import { ORB_PROFILES } from "./orb-profile.js";

const radiusOf = ({ x, y }: { x: number; y: number }) => Math.hypot(x, y);

describe("orb-geometry", () => {
  it("el contorno tiene la cantidad de segmentos pedida", () => {
    expect(orbOutline(ORB_PROFILES.idle, 0)).toHaveLength(ORB_OUTLINE_SEGMENTS);
    expect(orbOutline(ORB_PROFILES.idle, 0, 12)).toHaveLength(12);
  });

  it("la deformación queda acotada por energy y breath", () => {
    const profile = ORB_PROFILES.generating;
    const max = (1 + profile.breath) * (1 + profile.energy);
    const min = (1 - profile.breath) * (1 - profile.energy);
    for (const time of [0, 0.37, 1.2, 5.9]) {
      for (const point of orbOutline(profile, time)) {
        expect(radiusOf(point)).toBeLessThanOrEqual(max + 1e-9);
        expect(radiusOf(point)).toBeGreaterThanOrEqual(min - 1e-9);
      }
    }
  });

  it("es determinista y cambia con el tiempo", () => {
    expect(orbOutline(ORB_PROFILES.generating, 2)).toEqual(orbOutline(ORB_PROFILES.generating, 2));
    expect(orbOutline(ORB_PROFILES.generating, 2)).not.toEqual(
      orbOutline(ORB_PROFILES.generating, 2.5),
    );
  });

  it("hash01 devuelve valores en [0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      expect(hash01(i)).toBeGreaterThanOrEqual(0);
      expect(hash01(i)).toBeLessThan(1);
    }
  });

  it("sin comportamientos de partículas, todas son invisibles", () => {
    const particles = orbParticles(ORB_PROFILES.idle, 3);
    expect(particles).toHaveLength(ORB_PARTICLE_COUNT);
    expect(particles.every((particle) => particle.alpha === 0)).toBe(true);
  });

  it("en búsqueda las partículas salen de la superficie y quedan dentro del lienzo", () => {
    const particles = orbParticles(ORB_PROFILES.searching, 1.3);
    expect(particles.some((particle) => particle.alpha > 0.5)).toBe(true);
    for (const particle of particles) {
      expect(radiusOf(particle)).toBeGreaterThanOrEqual(1);
      expect(radiusOf(particle)).toBeLessThanOrEqual(1.85);
    }
  });

  it("en generación los tokens se alejan y se desvanecen", () => {
    for (const particle of orbParticles(ORB_PROFILES.generating, 4.2)) {
      expect(radiusOf(particle)).toBeLessThanOrEqual(1.85);
      expect(particle.alpha).toBeGreaterThanOrEqual(0);
      expect(particle.alpha).toBeLessThanOrEqual(1);
    }
  });

  it("las ondas de sonar solo existen al buscar y se apagan al expandirse", () => {
    expect(orbSonarWaves(ORB_PROFILES.idle, 1)).toEqual([]);
    const waves = orbSonarWaves(ORB_PROFILES.searching, 0.4);
    expect(waves).toHaveLength(2);
    for (const wave of waves) {
      expect(wave.radius).toBeGreaterThanOrEqual(1);
      expect(wave.radius).toBeLessThanOrEqual(1.8);
    }
    const [younger, older] = [...waves].sort((a, b) => a.radius - b.radius);
    expect(older!.alpha).toBeLessThan(younger!.alpha);
  });

  it("los anillos de escaneo solo existen cuando scan > 0", () => {
    expect(orbScanRings(ORB_PROFILES.idle, 1)).toEqual([]);
    const rings = orbScanRings(ORB_PROFILES.analyzing, 1);
    expect(rings).toHaveLength(3);
    expect(rings[0]!.alpha).toBeGreaterThan(rings[2]!.alpha);
  });
});
