// © 2026 Diego Lopez (diplez). All rights reserved.
import {
  INTENT_REQUEST_PROMPT,
  buildIntentInstruction,
  parseIntentResponse,
} from "./intent-prompts.js";
import {
  applyIntentEdit,
  intentChanges,
  isUnsure,
  normalizeIntent,
  toIntentInput,
  type Intent,
  type IntentEdit,
} from "./intent.js";

const input = {
  goal: "  Build a   sign-up form ",
  constraints: ["Email + password", { text: "Accessible" }, "", "email + PASSWORD"],
  assumptions: [
    { text: "React", options: ["Vue", "React", " Plain HTML "], confidence: 0.9 },
    { text: "Firebase Auth", options: ["Supabase"], confidence: 0.3 },
    "Tailwind CSS",
  ],
};

const apply = (intent: Intent, ...edits: IntentEdit[]): Intent =>
  edits.reduce((current, edit) => applyIntentEdit(current, edit), intent);

describe("normalizeIntent", () => {
  it("limpia textos, descarta vacíos y repetidos, y da ids por tipo", () => {
    const intent = normalizeIntent(input);
    expect(intent.goal).toBe("Build a sign-up form");
    expect(intent.items.map((item) => `${item.id}:${item.text}`)).toEqual([
      "constraint-0:Email + password",
      "constraint-1:Accessible",
      "assumption-0:React",
      "assumption-1:Firebase Auth",
      "assumption-2:Tailwind CSS",
    ]);
  });

  it("quita de las opciones la elegida y las repetidas", () => {
    expect(normalizeIntent(input).items[2]!.options).toEqual(["Vue", "Plain HTML"]);
  });

  it("marca como dudosas las suposiciones con poca confianza", () => {
    const [, , react, firebase, tailwind] = normalizeIntent(input).items;
    expect(isUnsure(react!)).toBe(false);
    expect(isUnsure(firebase!)).toBe(true);
    expect(isUnsure(tailwind!)).toBe(false); // sin confianza indicada
  });

  it("acepta una entrada vacía", () => {
    expect(normalizeIntent(null)).toEqual({ goal: "", originalGoal: "", items: [] });
  });
});

describe("applyIntentEdit e intentChanges", () => {
  it("registra reemplazos, quitados, agregados y el objetivo", () => {
    const intent = apply(
      normalizeIntent(input),
      { type: "goal", text: "Build a login form" },
      { type: "replace", id: "assumption-0", text: "Vue" },
      { type: "remove", id: "constraint-1" },
      { type: "add", kind: "constraint", text: "Works offline" },
    );
    expect(intentChanges(intent)).toEqual([
      { type: "goal", from: "Build a sign-up form", to: "Build a login form" },
      { type: "removed", kind: "constraint", text: "Accessible" },
      { type: "added", kind: "constraint", text: "Works offline" },
      { type: "replaced", kind: "assumption", from: "React", to: "Vue" },
    ]);
    expect(toIntentInput(intent)).toEqual({
      goal: "Build a login form",
      constraints: ["Email + password", "Works offline"],
      assumptions: ["Vue", "Firebase Auth", "Tailwind CSS"],
    });
  });

  it("volver al texto original o restaurar deja de contar como cambio", () => {
    const intent = apply(
      normalizeIntent(input),
      { type: "replace", id: "assumption-0", text: "Vue" },
      { type: "replace", id: "assumption-0", text: "React" },
      { type: "remove", id: "constraint-0" },
      { type: "restore", id: "constraint-0" },
    );
    expect(intentChanges(intent)).toEqual([]);
  });

  it("ignora cambios vacíos, repetidos o sin efecto", () => {
    const intent = normalizeIntent(input);
    expect(applyIntentEdit(intent, { type: "goal", text: "  " })).toBe(intent);
    expect(applyIntentEdit(intent, { type: "add", kind: "constraint", text: "accessible" })).toBe(
      intent,
    );
    expect(applyIntentEdit(intent, { type: "remove", id: "missing" })).toBe(intent);
  });

  it("un agregado que se quita desaparece de los cambios", () => {
    const intent = apply(
      normalizeIntent(input),
      { type: "add", kind: "assumption", text: "Mobile first" },
      { type: "remove", id: "assumption-3" },
    );
    expect(intentChanges(intent)).toEqual([]);
  });
});

describe("instrucciones para el modelo", () => {
  it("la petición describe el formato JSON esperado", () => {
    expect(INTENT_REQUEST_PROMPT).toContain('"assumptions"');
    expect(INTENT_REQUEST_PROMPT).toContain('"confidence"');
  });

  it("sin cambios solo confirma", () => {
    const instruction = buildIntentInstruction(normalizeIntent(input));
    expect(instruction).toContain("The user confirmed your interpretation.");
    expect(instruction).toContain('"goal": "Build a sign-up form"');
  });

  it("con cambios los enumera", () => {
    const instruction = buildIntentInstruction(
      apply(
        normalizeIntent(input),
        { type: "replace", id: "assumption-0", text: "Vue" },
        { type: "remove", id: "constraint-1" },
      ),
    );
    expect(instruction).toContain('- Use "Vue" instead of "React".');
    expect(instruction).toContain('- Drop the constraint "Accessible".');
    expect(instruction).toContain("Follow these corrections");
  });

  it("interpreta la respuesta del modelo aunque traiga texto alrededor", () => {
    const text = 'Sure!\n```json\n{"goal": "Sign-up form", "constraints": []}\n```';
    expect(parseIntentResponse(text)).toEqual({ goal: "Sign-up form", constraints: [] });
    expect(parseIntentResponse("no json here")).toBeNull();
    expect(parseIntentResponse("{broken")).toBeNull();
  });
});
