import { SPANISH_THINKING_LABELS } from "../../infrastructure/i18n/static-thinking-label-provider.js";
import { DzThinkingIndicator } from "../../presentation/components/thinking-indicator/dz-thinking-indicator.js";
import { THINKING_INDICATOR_TAG, defineThinkingIndicator } from "./define-thinking-indicator.js";

async function renderedLabel(tagName: string, attributes: string): Promise<string> {
  document.body.innerHTML = `<${tagName} ${attributes}></${tagName}>`;
  const element = document.querySelector(tagName) as DzThinkingIndicator;
  await element.updateComplete;
  return element.shadowRoot!.querySelector('[role="status"]')!.textContent!.trim();
}

// Test de integración: compone las cuatro capas reales.
describe("defineThinkingIndicator", () => {
  it("registra la etiqueta por defecto con etiquetas en inglés", async () => {
    const elementClass = defineThinkingIndicator();
    expect(customElements.get(THINKING_INDICATOR_TAG)).toBe(elementClass);
    expect(elementClass.prototype).toBeInstanceOf(DzThinkingIndicator);
    expect(await renderedLabel(THINKING_INDICATOR_TAG, 'phase="searching"')).toBe(
      "Searching sources…",
    );
  });

  it("es idempotente", () => {
    expect(defineThinkingIndicator()).toBe(defineThinkingIndicator());
  });

  it("permite etiqueta y diccionario personalizados", async () => {
    defineThinkingIndicator({ tagName: "es-thinking-indicator", labels: SPANISH_THINKING_LABELS });
    expect(await renderedLabel("es-thinking-indicator", 'phase="generating"')).toBe(
      "Generando respuesta…",
    );
  });

  it("trata un atributo phase inválido como idle", async () => {
    defineThinkingIndicator();
    expect(await renderedLabel(THINKING_INDICATOR_TAG, 'phase="nope"')).toBe("Idle");
  });
});
