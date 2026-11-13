import { ORB_PARTICLE_COUNT } from "../../../domain/orb/orb-geometry.js";
import { startOrbTransition } from "../../../domain/orb/orb-transition.js";
import { composeOrbFrame } from "./compose-orb-frame.js";

describe("composeOrbFrame", () => {
  const settled = startOrbTransition(null, "searching", undefined, 0);

  it("arma un frame completo para dibujar", () => {
    const frame = composeOrbFrame(settled, 2, false);
    expect(frame.phase).toBe("searching");
    expect(frame.outline.length).toBeGreaterThan(0);
    expect(frame.core.length).toBeGreaterThan(0);
    expect(frame.particles).toHaveLength(ORB_PARTICLE_COUNT);
    expect(frame.trails).toHaveLength(ORB_PARTICLE_COUNT);
  });

  it("con movimiento reducido no depende del reloj", () => {
    expect(composeOrbFrame(settled, 2, true)).toEqual(composeOrbFrame(settled, 9, true));
  });

  it("con movimiento reducido salta al perfil destino", () => {
    const moving = startOrbTransition(settled, "generating", undefined, 0, 1);
    const frame = composeOrbFrame(moving, 0.1, true);
    expect(frame.phase).toBe("generating");
    expect(frame.pulse).toBeNull();
    expect(frame.trails).toEqual([]);
  });
});
