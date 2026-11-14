import {
  createCountdown,
  decisionOnTimeout,
  pauseCountdown,
  remainingAt,
  resumeCountdown,
  toApprovalTone,
  toTimeoutAction,
  toTimeoutSeconds,
} from "../approval/approval.js";
import { confidencePercent, normalizeConfidence } from "../citation/confidence.js";
import { elapsedSeconds, normalizeReasoningSteps, reasoningProgress } from "./reasoning-step.js";

describe("reasoning", () => {
  it("normaliza strings y objetos parciales", () => {
    expect(
      normalizeReasoningSteps(["Leer", { title: "Buscar", status: "running" }, { status: "x" }]),
    ).toEqual([
      { id: "step-0", title: "Leer", status: "done", detail: "" },
      { id: "step-1", title: "Buscar", status: "running", detail: "" },
      { id: "step-2", title: "", status: "pending", detail: "" },
    ]);
    expect(normalizeReasoningSteps("nope")).toEqual([]);
  });

  it("calcula el estado global", () => {
    const steps = normalizeReasoningSteps([
      { title: "a", status: "done" },
      { title: "b", status: "running" },
      { title: "c", status: "pending" },
    ]);
    expect(reasoningProgress(steps)).toMatchObject({
      state: "running",
      completed: 1,
      total: 3,
      current: { title: "b" },
    });
    expect(reasoningProgress([]).state).toBe("idle");
    expect(reasoningProgress(normalizeReasoningSteps(["a", "b"])).state).toBe("done");
    expect(
      reasoningProgress(normalizeReasoningSteps([{ title: "a", status: "error" }])).state,
    ).toBe("error");
  });

  it("mide los segundos transcurridos", () => {
    expect(elapsedSeconds(null, null, 5000)).toBe(0);
    expect(elapsedSeconds(1000, null, 5400)).toBe(4);
    expect(elapsedSeconds(1000, 3000, 99999)).toBe(2);
  });
});

describe("approval", () => {
  it("por seguridad, ante la duda deniega", () => {
    expect(toTimeoutAction("approve")).toBe("approve");
    expect(toTimeoutAction("whatever")).toBe("deny");
    expect(decisionOnTimeout("deny")).toBe("denied");
  });

  it("valida tono y segundos", () => {
    expect(toApprovalTone("danger")).toBe("danger");
    expect(toApprovalTone("loud")).toBe("neutral");
    expect(toTimeoutSeconds("10")).toBe(10);
    expect(toTimeoutSeconds(-3)).toBe(0);
    expect(toTimeoutSeconds("abc")).toBe(0);
  });

  it("la cuenta regresiva se pausa y se reanuda sin perder tiempo", () => {
    let countdown = resumeCountdown(createCountdown(10_000), 0);
    expect(remainingAt(countdown, 4_000)).toBe(6_000);
    countdown = pauseCountdown(countdown, 4_000);
    expect(remainingAt(countdown, 60_000)).toBe(6_000);
    countdown = resumeCountdown(countdown, 60_000);
    expect(remainingAt(countdown, 61_000)).toBe(5_000);
    expect(remainingAt(countdown, 999_999)).toBe(0);
  });
});

describe("citation", () => {
  it.each([
    [0.87, 0.87],
    ["0.5", 0.5],
    [87, 0.87],
    ["87%", 0.87],
    ["150%", 1],
    [-1, 0],
  ])("normaliza %j", (input, expected) => {
    expect(normalizeConfidence(input)).toBeCloseTo(expected);
  });

  it("devuelve null sin número", () => {
    expect(normalizeConfidence("alta")).toBeNull();
    expect(normalizeConfidence(undefined)).toBeNull();
  });

  it("redondea el porcentaje", () => {
    expect(confidencePercent(0.876)).toBe(88);
  });
});
