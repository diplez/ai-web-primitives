import { SPANISH_THINKING_LABELS } from "../../infrastructure/i18n/static-thinking-label-provider.js";
import { DzThinkingOrb } from "../../presentation/components/thinking-orb/dz-thinking-orb.js";
import { THINKING_ORB_TAG, defineThinkingOrb } from "./define-thinking-orb.js";

HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

async function statusText(tagName: string, attributes: string): Promise<string> {
  document.body.innerHTML = `<${tagName} ${attributes}></${tagName}>`;
  const element = document.querySelector(tagName) as DzThinkingOrb;
  await element.updateComplete;
  return element.shadowRoot!.querySelector('[role="status"]')!.textContent!.trim();
}

// Test de integración: compone las cuatro capas reales (con requestAnimationFrame de jsdom).
describe("defineThinkingOrb", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("registra la etiqueta por defecto", async () => {
    const elementClass = defineThinkingOrb();
    expect(customElements.get(THINKING_ORB_TAG)).toBe(elementClass);
    expect(elementClass.prototype).toBeInstanceOf(DzThinkingOrb);
    expect(await statusText(THINKING_ORB_TAG, 'phase="generating"')).toBe("Generating response…");
  });

  it("es idempotente", () => {
    expect(defineThinkingOrb()).toBe(defineThinkingOrb());
  });

  it("permite etiqueta y textos personalizados", async () => {
    defineThinkingOrb({ tagName: "es-thinking-orb", labels: SPANISH_THINKING_LABELS });
    expect(await statusText("es-thinking-orb", 'phase="searching"')).toBe("Buscando fuentes…");
  });
});
