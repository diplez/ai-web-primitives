import type {
  AnimateThinkingOrbInput,
  OrbAnimationHandle,
} from "../../../application/use-cases/orb/animate-thinking-orb.js";
import type { GetThinkingStatusInput } from "../../../application/use-cases/thinking/get-thinking-status.js";
import { toThinkingPhase } from "../../../domain/thinking/thinking-phase.js";
import { DzThinkingOrb, type ThinkingOrbDependencies } from "./dz-thinking-orb.js";
import { readOrbPalette } from "./read-orb-palette.js";

// jsdom no implementa canvas: el renderer debe tolerar un contexto nulo.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

class FakeAnimation implements OrbAnimationHandle {
  phases: unknown[] = [];
  stopped = false;
  constructor(public input: AnimateThinkingOrbInput) {}
  setPhase(phase: unknown): void {
    this.phases.push(phase);
  }
  setVisible(): void {}
  stop(): void {
    this.stopped = true;
  }
}

const animations: FakeAnimation[] = [];
const fakeDependencies: ThinkingOrbDependencies = {
  animateThinkingOrb: {
    execute: (input) => {
      const animation = new FakeAnimation(input);
      animations.push(animation);
      return animation;
    },
  },
  getThinkingStatus: {
    execute: ({ phase, customLabel }: GetThinkingStatusInput) => ({
      phase: toThinkingPhase(phase),
      busy: phase !== "done" && phase !== "idle",
      label: customLabel ?? `fake:${String(phase)}`,
    }),
  },
};

class TestThinkingOrb extends DzThinkingOrb {
  static override dependencies = fakeDependencies;
}
customElements.define("test-thinking-orb", TestThinkingOrb);

async function mount(attributes: string): Promise<TestThinkingOrb> {
  animations.length = 0;
  document.body.innerHTML = `<test-thinking-orb ${attributes}></test-thinking-orb>`;
  const element = document.querySelector<TestThinkingOrb>("test-thinking-orb")!;
  await element.updateComplete;
  return element;
}

const statusOf = (element: DzThinkingOrb) =>
  element.shadowRoot!.querySelector<HTMLElement>('[role="status"]')!;

describe("DzThinkingOrb", () => {
  it("dibuja en un canvas oculto a lectores de pantalla y anuncia el estado", async () => {
    const element = await mount('phase="searching"');
    expect(element.shadowRoot!.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
    expect(statusOf(element)).toHaveTextContent("fake:searching");
    expect(statusOf(element)).toHaveAttribute("aria-busy", "true");
  });

  it("el texto de estado solo es visible con show-label", async () => {
    const hidden = await mount('phase="done"');
    expect(statusOf(hidden)).toHaveClass("visually-hidden");
    const visible = await mount('phase="done" show-label');
    expect(statusOf(visible)).not.toHaveClass("visually-hidden");
  });

  it("arranca la animación con la fase inicial", async () => {
    await mount('phase="generating"');
    expect(animations).toHaveLength(1);
    expect(animations[0]!.input.phase).toBe("generating");
  });

  it("transmite los cambios de fase a la animación", async () => {
    const element = await mount('phase="idle"');
    element.phase = "analyzing";
    await element.updateComplete;
    expect(animations[0]!.phases).toEqual(["analyzing"]);
    expect(element.getAttribute("phase")).toBe("analyzing");
  });

  it("detiene la animación al salir del DOM y la reanuda al volver", async () => {
    const element = await mount('phase="idle"');
    element.remove();
    expect(animations[0]!.stopped).toBe(true);
    document.body.append(element);
    expect(animations).toHaveLength(2);
  });
});

describe("readOrbPalette", () => {
  const styleWith = (values: Record<string, string>) => ({
    getPropertyValue: (property: string) => values[property] ?? "",
  });

  it("devuelve undefined si no hay colores definidos", () => {
    expect(readOrbPalette(styleWith({}))).toBeUndefined();
  });

  it("lee números e ignora valores inválidos", () => {
    expect(
      readOrbPalette(styleWith({ "--dz-orb-hue": " 340 ", "--dz-orb-saturation": "abc" })),
    ).toEqual({ hue: 340, accentHue: undefined, saturation: undefined });
  });
});
