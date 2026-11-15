import { isBusyPhase, isThinkingPhase, toThinkingPhase } from "./thinking-phase.js";
import { createThinkingStatus } from "./thinking-status.js";

describe("thinking-phase", () => {
  it("reconoce solo las fases válidas", () => {
    expect(isThinkingPhase("searching")).toBe(true);
    expect(isThinkingPhase("SEARCHING")).toBe(false);
    expect(isThinkingPhase(undefined)).toBe(false);
  });

  it("normaliza valores desconocidos a idle", () => {
    expect(toThinkingPhase("generating")).toBe("generating");
    expect(toThinkingPhase("whatever")).toBe("idle");
    expect(toThinkingPhase(null)).toBe("idle");
  });

  it.each([
    ["idle", false],
    ["analyzing", true],
    ["searching", true],
    ["generating", true],
    ["done", false],
  ] as const)("isBusyPhase(%s) = %s", (phase, busy) => {
    expect(isBusyPhase(phase)).toBe(busy);
  });

  it("crea un estado inmutable", () => {
    const status = createThinkingStatus("analyzing");
    expect(status).toEqual({ phase: "analyzing", busy: true });
    expect(Object.isFrozen(status)).toBe(true);
  });
});
