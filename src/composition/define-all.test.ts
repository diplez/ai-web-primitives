import { defineAll } from "./define-all.js";

HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

// Integración: registra todo con un registro aislado y renderiza en español.
describe("defineAll", () => {
  it("registra todos los componentes en el idioma pedido", async () => {
    defineAll({ locale: "es" });
    for (const tag of [
      "dz-thinking-orb",
      "dz-thinking-indicator",
      "dz-markdown",
      "dz-reasoning",
      "dz-approval",
      "dz-citation",
    ]) {
      expect(customElements.get(tag)).toBeDefined();
    }

    document.body.innerHTML = `
      <dz-approval heading="Borrar"></dz-approval>
      <dz-markdown>\`\`\`js
x
\`\`\`</dz-markdown>
      <dz-reasoning steps='["a"]'></dz-reasoning>`;
    const approval = document.querySelector("dz-approval")!;
    const markdown = document.querySelector("dz-markdown")!;
    const reasoning = document.querySelector("dz-reasoning")!;
    await Promise.all([approval.updateComplete, markdown.updateComplete, reasoning.updateComplete]);

    expect(approval.shadowRoot!.querySelector(".approve")).toHaveTextContent("Aprobar");
    expect(markdown.shadowRoot!.querySelector(".copy")).toHaveTextContent("Copiar");
    expect(reasoning.shadowRoot!.querySelector(".progress")).toHaveTextContent("1 de 1 pasos");
  });
});
