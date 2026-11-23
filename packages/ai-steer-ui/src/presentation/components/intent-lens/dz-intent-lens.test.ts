// © 2026 Diego Lopez (diplez). All rights reserved.
import { ReviewIntent } from "../../../application/use-cases/intent-lens/review-intent.js";
import { ENGLISH_UI_MESSAGES } from "../../../infrastructure/i18n/ui-messages.js";
import { DzIntentLens } from "./dz-intent-lens.js";

class TestIntentLens extends DzIntentLens {
  static override dependencies = {
    createReview: () => new ReviewIntent(),
    messages: ENGLISH_UI_MESSAGES.intentLens,
  };
}
customElements.define("test-intent-lens", TestIntentLens);

const INTENT = {
  goal: "Build a sign-up form",
  constraints: ["Email + password", "Accessible"],
  assumptions: [
    { text: "React", options: ["Vue", "Plain HTML"], confidence: 0.9 },
    { text: "Firebase Auth", options: ["Supabase"], confidence: 0.3 },
  ],
};

async function mount(): Promise<TestIntentLens> {
  document.body.innerHTML = `<test-intent-lens></test-intent-lens>`;
  const element = document.querySelector<TestIntentLens>("test-intent-lens")!;
  element.intent = INTENT;
  await element.updateComplete;
  return element;
}

const $ = <T extends Element>(element: HTMLElement, selector: string): T | null =>
  element.shadowRoot!.querySelector<T>(selector);
const $$ = (element: HTMLElement, selector: string): HTMLElement[] => [
  ...element.shadowRoot!.querySelectorAll<HTMLElement>(selector),
];
const text = (node: Element | null | undefined): string =>
  node?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const chip = (element: HTMLElement, label: string): HTMLElement =>
  $$(element, ".chip").find((node) => text(node).startsWith(label))!;

describe("DzIntentLens", () => {
  it("muestra objetivo, restricciones y suposiciones", async () => {
    const element = await mount();
    expect(text($(element, "header"))).toBe("Here's what I understood");
    expect(
      $$(element, '[data-kind="constraint"]').map((node) => text(node.querySelector(".label"))),
    ).toEqual(["Email + password", "Accessible"]);
    expect(text($(element, '[data-kind="goal"]'))).toContain("Build a sign-up form");
    expect(text($(element, ".primary"))).toBe("Looks right, continue");
  });

  it("marca la suposición dudosa", async () => {
    const element = await mount();
    const firebase = chip(element, "Firebase Auth");
    expect(firebase.hasAttribute("data-unsure")).toBe(true);
    expect(text(firebase)).toContain("Not sure");
    expect(chip(element, "React").hasAttribute("data-unsure")).toBe(false);
  });

  it("elige una alternativa desde el menú y emite dz-intent-change", async () => {
    const element = await mount();
    const changes: unknown[] = [];
    element.addEventListener("dz-intent-change", (event) =>
      changes.push((event as CustomEvent).detail),
    );

    chip(element, "React").click();
    await element.updateComplete;
    expect(chip(element, "React").getAttribute("aria-expanded")).toBe("true");
    const vue = $$(element, ".menu button").find((button) => text(button) === "Vue")!;
    vue.click();
    await element.updateComplete;

    expect($(element, ".menu")).toBeNull();
    expect(chip(element, "Vue").dataset["state"]).toBe("changed");
    expect(text($(element, ".count"))).toBe("1 correction");
    expect(text($(element, ".primary"))).toBe("Continue with my changes");
    expect(changes).toHaveLength(1);
    expect((changes[0] as { instruction: string }).instruction).toContain(
      'Use "Vue" instead of "React"',
    );
  });

  it("quita y restaura una restricción", async () => {
    const element = await mount();
    const remove = () => chip(element, "Accessible").querySelector<HTMLButtonElement>(".x")!;
    remove().click();
    await element.updateComplete;
    expect(chip(element, "Accessible").dataset["state"]).toBe("removed");
    remove().click();
    await element.updateComplete;
    expect(chip(element, "Accessible").dataset["state"]).toBe("original");
    expect($(element, ".count")).toBeNull();
  });

  it("agrega una restricción escribiéndola", async () => {
    const element = await mount();
    $$(element, ".add")[0]!.click();
    await element.updateComplete;
    const input = $<HTMLInputElement>(element, "input")!;
    expect(element.shadowRoot!.activeElement).toBe(input);
    input.value = "Works offline";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await element.updateComplete;
    expect(chip(element, "Works offline").dataset["state"]).toBe("added");
    expect(element.result.intent.constraints).toEqual([
      "Email + password",
      "Accessible",
      "Works offline",
    ]);
  });

  it("edita el objetivo y Escape cancela sin cambios", async () => {
    const element = await mount();
    chip(element, "Build a sign-up form").click();
    await element.updateComplete;
    let input = $<HTMLInputElement>(element, "input")!;
    input.value = "Something else";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await element.updateComplete;
    expect(element.result.changes).toEqual([]);

    chip(element, "Build a sign-up form").click();
    await element.updateComplete;
    input = $<HTMLInputElement>(element, "input")!;
    input.value = "Build a login form";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await element.updateComplete;
    expect(element.result.intent.goal).toBe("Build a login form");
  });

  it("escribe una alternativa propia para una suposición", async () => {
    const element = await mount();
    chip(element, "Firebase Auth").click();
    await element.updateComplete;
    $$(element, ".menu button")
      .find((button) => text(button).includes("Write my own"))!
      .click();
    await element.updateComplete;
    const input = $<HTMLInputElement>(element, "input")!;
    input.value = "Auth0";
    input.dispatchEvent(new FocusEvent("blur"));
    await element.updateComplete;
    expect(chip(element, "Auth0").dataset["state"]).toBe("changed");
    expect(chip(element, "Auth0").hasAttribute("data-unsure")).toBe(false);
  });

  it("confirma, bloquea la edición y permite reabrir", async () => {
    const element = await mount();
    element.edit({ type: "remove", id: "constraint-1" });
    const onConfirm = vi.fn();
    element.addEventListener("dz-intent-confirm", onConfirm);
    $<HTMLButtonElement>(element, ".primary")!.click();
    await element.updateComplete;

    expect(element.status).toBe("confirmed");
    expect(element.getAttribute("status")).toBe("confirmed");
    expect(onConfirm.mock.calls[0]![0].detail.intent.constraints).toEqual(["Email + password"]);
    expect($$(element, ".add")).toHaveLength(0);
    expect(chip(element, "React").hasAttribute("disabled")).toBe(true);
    expect(text($(element, ".done"))).toContain("Confirmed");

    $<HTMLButtonElement>(element, "footer .button")!.click();
    await element.updateComplete;
    expect(element.status).toBe("review");
  });

  it("deshace las correcciones y una interpretación nueva reinicia todo", async () => {
    const element = await mount();
    element.edit({ type: "replace", id: "assumption-0", text: "Vue" });
    await element.updateComplete;
    $$(element, "footer .button")
      .find((button) => text(button) === "Undo my changes")!
      .click();
    await element.updateComplete;
    expect(element.result.changes).toEqual([]);

    element.confirm();
    element.intent = { goal: "Another task" };
    await element.updateComplete;
    expect(element.status).toBe("review");
    expect(text($(element, '[data-kind="goal"]'))).toContain("Another task");
  });

  it("Escape cierra el menú y devuelve el foco a la ficha", async () => {
    const element = await mount();
    chip(element, "React").click();
    await element.updateComplete;
    $(element, ".frame")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await element.updateComplete;
    await element.updateComplete;
    expect($(element, ".menu")).toBeNull();
    expect(element.shadowRoot!.activeElement).toBe(chip(element, "React"));
  });
});
