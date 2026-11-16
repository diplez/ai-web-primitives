import type { Clock } from "../../../application/ports/clock.js";
import { AnswerDialSession } from "../../../application/use-cases/answer-dial/answer-dial-session.js";
import { planMorph } from "../../../application/use-cases/answer-dial/plan-morph.js";
import { ENGLISH_UI_MESSAGES } from "../../../infrastructure/i18n/ui-messages.js";
import { DzAnswerDial, type RewriteRequest } from "./dz-answer-dial.js";

/** Reloj manual: `advance()` dispara los temporizadores vencidos. */
class FakeClock implements Clock {
  time = 0;
  timers: { at: number; callback: () => void }[] = [];
  after(milliseconds: number, callback: () => void): () => void {
    const timer = { at: this.time + milliseconds, callback };
    this.timers.push(timer);
    return () => (this.timers = this.timers.filter((t) => t !== timer));
  }
  advance(milliseconds: number): void {
    const target = this.time + milliseconds;
    for (;;) {
      const due = this.timers.filter((t) => t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.time = due.at;
      this.timers = this.timers.filter((t) => t !== due);
      due.callback();
    }
    this.time = target;
  }
}

const clock = new FakeClock();
const motion = { reduced: true, prefersReducedMotion: () => motion.reduced };

class TestAnswerDial extends DzAnswerDial {
  static override dependencies = {
    createSession: () => new AnswerDialSession(),
    planMorph,
    clock,
    motion,
    messages: ENGLISH_UI_MESSAGES.answerDial,
  };
}
customElements.define("test-answer-dial", TestAnswerDial);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function mount(
  markup = `<test-answer-dial text="Caches keep data close."></test-answer-dial>`,
) {
  document.body.innerHTML = markup;
  const element = document.querySelector<TestAnswerDial>("test-answer-dial")!;
  await element.updateComplete;
  return element;
}

const answer = (element: HTMLElement): string =>
  element.shadowRoot!.querySelector(".text")!.textContent ?? "";
const knobs = (element: HTMLElement): HTMLElement[] => [
  ...element.shadowRoot!.querySelectorAll<HTMLElement>("[role=slider]"),
];

describe("DzAnswerDial", () => {
  beforeEach(() => {
    clock.time = 0;
    clock.timers = [];
    motion.reduced = true;
  });

  it("muestra la respuesta y las perillas por defecto, accesibles", async () => {
    const element = await mount();
    expect(answer(element)).toBe("Caches keep data close.");
    const [length, level] = knobs(element);
    expect(length!.getAttribute("aria-label")).toBe("Shorter ↔ Longer");
    expect(level!.getAttribute("aria-label")).toBe("Simpler ↔ More technical");
    expect(length!.getAttribute("aria-valuenow")).toBe("2");
    expect(length!.getAttribute("aria-valuetext")).toBe("Original");
    expect(element.shadowRoot!.querySelector<HTMLButtonElement>(".reset")!.disabled).toBe(true);
  });

  it("acepta perillas por atributo", async () => {
    const element = await mount(`<test-answer-dial dials="tone"></test-answer-dial>`);
    expect(knobs(element).map((knob) => knob.getAttribute("aria-label"))).toEqual([
      "Casual ↔ Formal",
    ]);
  });

  it("con el teclado mueve la perilla y pide la reescritura al detenerse", async () => {
    const element = await mount();
    const rewrite = vi.fn((request: RewriteRequest) => `Short (${request.values["length"]})`);
    element.rewrite = rewrite;
    const changes: unknown[] = [];
    element.addEventListener("dz-dial-change", (event) =>
      changes.push((event as CustomEvent).detail),
    );

    knobs(element)[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    await element.updateComplete;
    expect(element.busy).toBe(true);
    expect(knobs(element)[0]!.getAttribute("aria-valuetext")).toBe("Shorter, 1 of 2");
    expect(rewrite).not.toHaveBeenCalled(); // espera a que se detenga

    clock.advance(350);
    await flush();
    await element.updateComplete;
    expect(rewrite).toHaveBeenCalledOnce();
    expect(rewrite.mock.calls[0]![0]).toMatchObject({
      original: "Caches keep data close.",
      values: { length: 1, level: 2 },
    });
    expect(rewrite.mock.calls[0]![0].instruction).toContain("Make it a bit shorter.");
    expect(answer(element)).toBe("Short (1)");
    expect(element.busy).toBe(false);
    expect(changes).toEqual([
      expect.objectContaining({ values: { length: 1, level: 2 }, cached: false, original: false }),
    ]);
  });

  it("solo pide la última posición si la perilla se mueve varias veces seguidas", async () => {
    const element = await mount();
    const rewrite = vi.fn((request: RewriteRequest) => `v${request.values["length"]}`);
    element.rewrite = rewrite;
    element.setDial("length", 1);
    await element.updateComplete;
    clock.advance(100);
    element.setDial("length", 0);
    await element.updateComplete;
    clock.advance(350);
    await flush();
    await element.updateComplete;
    expect(rewrite).toHaveBeenCalledOnce();
    expect(answer(element)).toBe("v0");
  });

  it("recuerda las posiciones ya vistas y vuelve al original", async () => {
    const element = await mount();
    const rewrite = vi.fn(() => "Short");
    element.rewrite = rewrite;
    element.setDial("length", 1);
    await element.updateComplete;
    clock.advance(350);
    await flush();
    await element.updateComplete;

    element.reset();
    await element.updateComplete;
    expect(answer(element)).toBe("Caches keep data close.");

    element.setDial("length", 1);
    await element.updateComplete;
    expect(answer(element)).toBe("Short"); // al instante, sin esperar
    expect(element.busy).toBe(false);
    expect(rewrite).toHaveBeenCalledOnce();
  });

  it("sin rewrite, la app entrega el texto con showRewrite()", async () => {
    const element = await mount();
    let instruction = "";
    element.addEventListener("dz-dial-change", (event) => {
      instruction = (event as CustomEvent).detail.instruction;
    });
    element.setDial("level", 4);
    await element.updateComplete;
    clock.advance(350);
    expect(instruction).toContain("as more technical, for an expert as possible");
    element.showRewrite("Technical answer");
    await element.updateComplete;
    expect(answer(element)).toBe("Technical answer");
  });

  it("si rewrite falla muestra un error y emite dz-rewrite-error", async () => {
    const element = await mount();
    element.rewrite = () => Promise.reject(new Error("rate limit"));
    const onError = vi.fn();
    element.addEventListener("dz-rewrite-error", onError);
    element.setDial("length", 3);
    await element.updateComplete;
    clock.advance(350);
    await flush();
    await element.updateComplete;
    expect(onError).toHaveBeenCalledOnce();
    expect(element.busy).toBe(false);
    expect(element.shadowRoot!.querySelector("[role=alert]")!.textContent).toContain(
      "Couldn't rewrite",
    );
  });

  it("un texto nuevo reinicia las perillas", async () => {
    const element = await mount();
    element.setDial("length", 0);
    await element.updateComplete;
    element.text = "A brand new answer.";
    await element.updateComplete;
    expect(knobs(element)[0]!.getAttribute("aria-valuenow")).toBe("2");
    expect(element.busy).toBe(false);
    expect(answer(element)).toBe("A brand new answer.");
  });

  it("anima las palabras nuevas y al final deja el texto limpio", async () => {
    motion.reduced = false;
    const element = await mount();
    element.rewrite = () => "Caches keep hot data close.";
    element.setDial("length", 3);
    await element.updateComplete;
    clock.advance(350);
    await flush();
    await element.updateComplete;
    clock.advance(200);
    await element.updateComplete;
    const inserted = [...element.shadowRoot!.querySelectorAll(".in")].map(
      (span) => span.textContent,
    );
    expect(inserted).toEqual(["hot "]);
    clock.advance(3000);
    await element.updateComplete;
    expect(element.shadowRoot!.querySelectorAll(".in, .out")).toHaveLength(0);
    expect(answer(element)).toBe("Caches keep hot data close.");
  });

  it("los extremos con etiqueta mueven un paso", async () => {
    const element = await mount();
    const [shorter] = element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".end");
    shorter!.click();
    await element.updateComplete;
    expect(element.values).toEqual({ length: 1, level: 2 });
  });
});
