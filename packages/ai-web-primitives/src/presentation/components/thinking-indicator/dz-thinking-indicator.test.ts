import type { GetThinkingStatusInput } from "../../../application/use-cases/thinking/get-thinking-status.js";
import { toThinkingPhase } from "../../../domain/thinking/thinking-phase.js";
import {
  DzThinkingIndicator,
  type ThinkingIndicatorDependencies,
} from "./dz-thinking-indicator.js";

// La presentación se prueba con un caso de uso falso: no depende de infraestructura.
const fakeDependencies: ThinkingIndicatorDependencies = {
  getThinkingStatus: {
    execute: ({ phase, customLabel }: GetThinkingStatusInput) => ({
      phase: toThinkingPhase(phase),
      busy: phase !== "done",
      label: customLabel ?? `fake:${String(phase)}`,
    }),
  },
};

class TestThinkingIndicator extends DzThinkingIndicator {
  static override dependencies = fakeDependencies;
}
customElements.define("test-thinking-indicator", TestThinkingIndicator);

async function mount(attributes: string): Promise<TestThinkingIndicator> {
  document.body.innerHTML = `<test-thinking-indicator ${attributes}></test-thinking-indicator>`;
  const element = document.querySelector<TestThinkingIndicator>("test-thinking-indicator")!;
  await element.updateComplete;
  return element;
}

const statusOf = (element: DzThinkingIndicator) =>
  element.shadowRoot!.querySelector('[role="status"]')!;

describe("DzThinkingIndicator", () => {
  it("renderiza el DTO del caso de uso de forma accesible", async () => {
    const element = await mount('phase="searching"');
    expect(statusOf(element)).toHaveAttribute("aria-busy", "true");
    expect(statusOf(element)).toHaveAttribute("data-phase", "searching");
    expect(statusOf(element)).toHaveTextContent("fake:searching");
  });

  it("pasa la etiqueta personalizada al caso de uso", async () => {
    const element = await mount('phase="done" label="Listo"');
    expect(statusOf(element)).toHaveAttribute("aria-busy", "false");
    expect(statusOf(element)).toHaveTextContent("Listo");
  });

  it("refleja la propiedad phase como atributo", async () => {
    const element = await mount("");
    element.phase = "generating";
    await element.updateComplete;
    expect(element.getAttribute("phase")).toBe("generating");
  });

  it("falla con un mensaje claro si no fue registrado por la composición", async () => {
    class UnwiredThinkingIndicator extends DzThinkingIndicator {}
    customElements.define("unwired-thinking-indicator", UnwiredThinkingIndicator);
    const element = new UnwiredThinkingIndicator();
    expect(() => (element as unknown as { render(): unknown }).render()).toThrow(
      /defineThinkingIndicator/,
    );
  });
});
