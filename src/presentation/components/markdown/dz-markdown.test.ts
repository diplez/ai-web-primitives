import type { StreamMarkdownInput } from "../../../application/use-cases/markdown/stream-markdown.js";
import { ENGLISH_UI_MESSAGES } from "../../../infrastructure/i18n/ui-messages.js";
import { DzMarkdown, type MarkdownDependencies } from "./dz-markdown.js";

const copied: string[] = [];
let lastStreamInput: StreamMarkdownInput | null = null;

const dependencies: MarkdownDependencies = {
  streamMarkdown: {
    execute: async (input) => {
      lastStreamInput = input;
      input.onText("# Hola");
      input.onReasoning?.("pienso");
      return { text: "# Hola", aborted: false };
    },
  },
  clipboard: { write: async (text) => void copied.push(text) },
  clock: { every: () => () => {} },
  messages: ENGLISH_UI_MESSAGES.markdown,
};

class TestMarkdown extends DzMarkdown {
  static override dependencies = dependencies;
}
customElements.define("test-markdown", TestMarkdown);

async function mount(html: string): Promise<TestMarkdown> {
  document.body.innerHTML = html;
  const element = document.querySelector<TestMarkdown>("test-markdown")!;
  await element.updateComplete;
  return element;
}

const shadow = (element: DzMarkdown) => element.shadowRoot!;

describe("DzMarkdown", () => {
  it("renderiza markdown desde la propiedad content", async () => {
    const element = await mount("<test-markdown></test-markdown>");
    element.content = "# Título\n\n**negrita** y `código`";
    await element.updateComplete;
    expect(shadow(element).querySelector("h1")).toHaveTextContent("Título");
    expect(shadow(element).querySelector("strong")).toHaveTextContent("negrita");
    expect(shadow(element).querySelector("code.inline-code")).toHaveTextContent("código");
  });

  it("toma el texto escrito dentro de la etiqueta, sin la sangría", async () => {
    const element = await mount(`<test-markdown>
        - uno
        - dos
      </test-markdown>`);
    expect(shadow(element).querySelectorAll("li")).toHaveLength(2);
  });

  it("nunca ejecuta HTML ni enlaces peligrosos", async () => {
    const element = await mount("<test-markdown></test-markdown>");
    element.content =
      '<script>alert(1)</script> <img src=x onerror="alert(1)">\n\n[x](javascript:alert(1))';
    await element.updateComplete;
    expect(shadow(element).querySelector("script")).toBeNull();
    expect(shadow(element).querySelector("img")).toBeNull();
    expect(shadow(element).querySelector("a")).toBeNull();
    expect(shadow(element).textContent).toContain("<script>alert(1)</script>");
  });

  it("abre los enlaces seguros en otra pestaña sin opener", async () => {
    const element = await mount("<test-markdown></test-markdown>");
    element.content = "[doc](https://example.com)";
    await element.updateComplete;
    const link = shadow(element).querySelector("a")!;
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("muestra el cursor mientras hay streaming", async () => {
    const element = await mount("<test-markdown streaming></test-markdown>");
    element.content = "Hola **mun";
    await element.updateComplete;
    expect(shadow(element).querySelector("p strong")).toHaveTextContent("mun");
    expect(shadow(element).querySelector(".caret")).not.toBeNull();
    element.streaming = false;
    await element.updateComplete;
    expect(shadow(element).querySelector(".caret")).toBeNull();
  });

  it("appendText y clear modifican el contenido", async () => {
    const element = await mount("<test-markdown></test-markdown>");
    element.appendText("Hola ");
    element.appendText("mundo");
    expect(element.content).toBe("Hola mundo");
    element.clear();
    expect(element.content).toBe("");
  });

  it("stream() emite eventos y reenvía el razonamiento", async () => {
    const element = await mount("<test-markdown></test-markdown>");
    const events: string[] = [];
    for (const name of ["dz-stream-start", "dz-stream-end", "dz-reasoning"]) {
      element.addEventListener(name, () => events.push(name));
    }
    const reasoning: string[] = [];
    const result = await element.stream("fuente", {
      onReasoning: (delta) => reasoning.push(delta),
    });

    expect(result.text).toBe("# Hola");
    expect(lastStreamInput!.source).toBe("fuente");
    expect(events).toEqual(["dz-stream-start", "dz-reasoning", "dz-stream-end"]);
    expect(reasoning).toEqual(["pienso"]);
    expect(element.streaming).toBe(false);
  });

  it("copia el código de un bloque", async () => {
    const element = await mount("<test-markdown></test-markdown>");
    element.content = "```js\nconst a = 1;\n```";
    await element.updateComplete;
    const copiedEvents: unknown[] = [];
    element.addEventListener("dz-copy", (event) =>
      copiedEvents.push((event as CustomEvent).detail),
    );
    shadow(element).querySelector<HTMLButtonElement>(".copy")!.click();
    await Promise.resolve();
    await element.updateComplete;
    expect(copied).toContain("const a = 1;");
    expect(copiedEvents).toEqual([{ text: "const a = 1;", language: "js" }]);
    expect(shadow(element).querySelector(".copy")).toHaveTextContent("Copied");
  });
});
