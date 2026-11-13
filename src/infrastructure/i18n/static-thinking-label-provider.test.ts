import {
  SPANISH_THINKING_LABELS,
  StaticThinkingLabelProvider,
} from "./static-thinking-label-provider.js";

describe("StaticThinkingLabelProvider", () => {
  it("usa inglés por defecto", () => {
    expect(new StaticThinkingLabelProvider().getLabel("searching")).toBe("Searching sources…");
  });

  it("acepta un diccionario alternativo", () => {
    const labelProvider = new StaticThinkingLabelProvider(SPANISH_THINKING_LABELS);
    expect(labelProvider.getLabel("done")).toBe("Listo");
  });
});
