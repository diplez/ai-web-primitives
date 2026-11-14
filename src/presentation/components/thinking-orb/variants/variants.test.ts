import { startOrbTransition } from "../../../../domain/orb/orb-transition.js";
import { ORB_VARIANTS } from "../../../../domain/orb/orb-variant.js";
import { THINKING_PHASES } from "../../../../domain/thinking/thinking-phase.js";
import { composeOrbFrame } from "../../../../application/use-cases/orb/compose-orb-frame.js";
import { OrbCanvasRenderer } from "../orb-canvas-renderer.js";
import { ORB_VARIANT_RENDERERS } from "./orb-variant-registry.js";

/**
 * Contexto 2D falso que registra las llamadas y falla ante cualquier número no finito
 * (NaN o Infinity), el error típico que deja un lienzo en blanco sin avisar.
 */
function strictContext() {
  const calls: string[] = [];
  const gradient = { addColorStop: (offset: number) => check("addColorStop", [offset]) };
  const check = (name: string, args: unknown[]) => {
    for (const arg of args) {
      if (typeof arg === "number" && !Number.isFinite(arg)) {
        throw new Error(`${name} recibió ${arg}`);
      }
      if (typeof arg === "string" && /NaN|Infinity/.test(arg)) {
        throw new Error(`${name} recibió "${arg}"`);
      }
    }
  };
  const target: Record<string, unknown> = {};
  return {
    calls,
    context: new Proxy(target, {
      get(store, property: string) {
        if (property in store) return store[property];
        if (property.startsWith("create")) {
          return (...args: unknown[]) => {
            check(property, args);
            return gradient;
          };
        }
        return (...args: unknown[]) => {
          check(property, args);
          calls.push(property);
        };
      },
      set(store, property: string, value: unknown) {
        check(property, [value]);
        store[property] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D,
  };
}

describe("diseños del orbe", () => {
  it("hay un dibujante para cada diseño", () => {
    expect(Object.keys(ORB_VARIANT_RENDERERS).sort()).toEqual([...ORB_VARIANTS].sort());
  });

  describe.each(ORB_VARIANTS)("%s", (variant) => {
    it.each(THINKING_PHASES)(
      "dibuja la fase %s sin valores inválidos, también en transición",
      (phase) => {
        const { context, calls } = strictContext();
        const canvas = {
          getContext: () => context,
          width: 0,
          height: 0,
        } as unknown as HTMLCanvasElement;
        const renderer = new OrbCanvasRenderer(canvas);
        renderer.setVariant(variant);
        renderer.resize(160, 160, 2);

        const settled = startOrbTransition(null, "idle", undefined, 0);
        const moving = startOrbTransition(settled, phase, undefined, 1, 1);
        for (const time of [1, 1.3, 1.7, 2.5, 7.9]) {
          renderer.draw(composeOrbFrame(moving, time, false));
        }
        renderer.draw(composeOrbFrame(moving, 3, true)); // movimiento reducido
        expect(calls.length).toBeGreaterThan(10);
      },
    );
  });
});
