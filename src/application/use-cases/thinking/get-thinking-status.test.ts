import type { ThinkingLabelProvider } from "../../ports/thinking-label-provider.js";
import { GetThinkingStatus } from "./get-thinking-status.js";

const fakeLabelProvider: ThinkingLabelProvider = { getLabel: (phase) => `label:${phase}` };

describe("GetThinkingStatus", () => {
  const getThinkingStatus = new GetThinkingStatus(fakeLabelProvider);

  it("usa la etiqueta del proveedor cuando no hay etiqueta personalizada", () => {
    expect(getThinkingStatus.execute({ phase: "searching" })).toEqual({
      phase: "searching",
      busy: true,
      label: "label:searching",
    });
  });

  it("prioriza la etiqueta personalizada", () => {
    expect(getThinkingStatus.execute({ phase: "done", customLabel: "Listo" }).label).toBe("Listo");
  });

  it("ignora etiquetas personalizadas vacías", () => {
    expect(getThinkingStatus.execute({ phase: "done", customLabel: "   " }).label).toBe(
      "label:done",
    );
  });

  it("trata una fase inválida como idle", () => {
    expect(getThinkingStatus.execute({ phase: "nope" })).toMatchObject({
      phase: "idle",
      busy: false,
    });
  });
});
