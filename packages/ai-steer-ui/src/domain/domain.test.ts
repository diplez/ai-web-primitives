import { ENGLISH_UI_MESSAGES } from "../infrastructure/i18n/ui-messages.js";
import {
  isOriginal,
  normalizeDials,
  normalizeSteps,
  normalizeValues,
  valuesKey,
} from "./dial/dial.js";
import { buildRewriteInstruction } from "./dial/rewrite-instruction.js";
import { changeRatio, diffWords, splitWords } from "./text/word-diff.js";

const presets = ENGLISH_UI_MESSAGES.answerDial.presets;

describe("dials", () => {
  it("usa length y level por defecto", () => {
    expect(normalizeDials([], presets).map((dial) => dial.id)).toEqual(["length", "level"]);
  });

  it("acepta presets y perillas propias, sin repetidos ni inválidas", () => {
    const dials = normalizeDials(
      [
        "tone",
        "tone",
        { id: "humor", start: "Serious", end: "Funny", steps: 4 },
        { id: "x" } as never,
      ],
      presets,
    );
    expect(dials.map((dial) => dial.id)).toEqual(["tone", "humor"]);
    expect(dials[0]).toMatchObject({ start: "Casual", end: "Formal", steps: 5, center: 2 });
    expect(dials[1]).toMatchObject({ steps: 5, center: 2, startHint: "serious", endHint: "funny" });
  });

  it("los pasos son impares y entre 3 y 9", () => {
    expect(normalizeSteps(1)).toBe(3);
    expect(normalizeSteps(6)).toBe(7);
    expect(normalizeSteps(20)).toBe(9);
    expect(normalizeSteps("x")).toBe(5);
  });

  it("ajusta los valores y deja en el centro los que faltan", () => {
    const dials = normalizeDials(["length", "level"], presets);
    expect(normalizeValues(dials, { length: 9, level: -3 })).toEqual({ length: 4, level: 0 });
    expect(normalizeValues(dials, {})).toEqual({ length: 2, level: 2 });
    expect(isOriginal(dials, { length: 2, level: 2 })).toBe(true);
    expect(valuesKey(dials, { length: 1, level: 2 })).toBe("length=1&level=2");
  });
});

describe("buildRewriteInstruction", () => {
  const dials = normalizeDials(["length", "level"], presets);

  it("no pide nada en la posición original", () => {
    expect(buildRewriteInstruction(dials, { length: 2, level: 2 })).toBe("");
  });

  it("gradúa la intensidad según la distancia al centro", () => {
    const instruction = buildRewriteInstruction(dials, { length: 0, level: 3 });
    expect(instruction).toContain("- Make it as shorter as possible.");
    expect(instruction).toContain("- Make it a bit more technical, for an expert.");
    expect(instruction.startsWith("Rewrite your previous answer.")).toBe(true);
    expect(instruction).toContain("Reply only with the rewritten answer.");
  });

  it("usa 'much' en perillas con más pasos", () => {
    const [humor] = normalizeDials(
      [{ id: "humor", start: "Serious", end: "Funny", steps: 7 }],
      presets,
    );
    expect(buildRewriteInstruction([humor!], { humor: 5 })).toContain("- Make it much funny.");
  });
});

describe("diffWords", () => {
  const visible = (before: string, after: string): string =>
    diffWords(before, after)
      .filter((token) => token.op !== "delete")
      .map((token) => token.text)
      .join("");

  it("divide en palabra + espacio y conserva el espacio inicial", () => {
    expect(splitWords("  hola  mundo\n")).toEqual(["  ", "hola  ", "mundo\n"]);
  });

  it("el texto visible es exactamente el nuevo", () => {
    const after = "A cache keeps hot data close.\n\nIt makes apps faster.";
    expect(visible("A cache stores copies of data.", after)).toBe(after);
  });

  it("marca conservadas, borradas e insertadas", () => {
    const ops = diffWords("the quick fox", "the slow fox").map(
      (token) => `${token.op}:${token.text.trim()}`,
    );
    expect(ops).toEqual(["keep:the", "delete:quick", "insert:slow", "keep:fox"]);
  });

  it("un cambio de espaciado no cuenta como palabra distinta", () => {
    expect(diffWords("a  b", "a b").every((token) => token.op === "keep")).toBe(true);
  });

  it("calcula la proporción de cambio", () => {
    expect(changeRatio(diffWords("a b c d", "a b c d"))).toBe(0);
    expect(changeRatio(diffWords("a b", "c d"))).toBe(1);
    expect(changeRatio(diffWords("a b c d", "a b x y"))).toBe(0.5);
    expect(changeRatio([])).toBe(0);
  });
});
