import { ENGLISH_UI_MESSAGES } from "../../infrastructure/i18n/ui-messages.js";
import type { Clock } from "../ports/clock.js";
import {
  RunApprovalCountdown,
  type ApprovalCountdownTick,
} from "./approval/run-approval-countdown.js";
import { DescribeReasoning } from "./reasoning/describe-reasoning.js";

class FakeClock implements Clock {
  time = 0;
  callbacks = new Set<() => void>();
  now(): number {
    return this.time;
  }
  every(milliseconds: number, callback: () => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  advance(milliseconds: number): void {
    this.time += milliseconds;
    for (const callback of [...this.callbacks]) callback();
  }
}

describe("DescribeReasoning", () => {
  const describeReasoning = new DescribeReasoning(ENGLISH_UI_MESSAGES.reasoning);

  it("describe un razonamiento en curso", () => {
    const view = describeReasoning.execute({
      steps: [
        { id: "a", title: "Read", status: "done" },
        { id: "b", title: "Search", status: "running" },
      ],
      elapsedSeconds: 3,
    });
    expect(view.headline).toBe("Thinking…");
    expect(view.progressLabel).toBe("1 of 2 steps");
    expect(view.currentId).toBe("b");
    expect(view.steps[1]!.statusLabel).toBe("In progress");
  });

  it("al terminar muestra la duración", () => {
    const view = describeReasoning.execute({ steps: ["a", "b"], elapsedSeconds: 7 });
    expect(view.headline).toBe("Thought for 7s");
    expect(describeReasoning.execute({ steps: ["a"], elapsedSeconds: 0 }).headline).toBe(
      "Reasoning complete",
    );
  });

  it("reporta errores y estado vacío", () => {
    expect(
      describeReasoning.execute({ steps: [{ title: "x", status: "error" }], elapsedSeconds: 1 })
        .headline,
    ).toBe("Reasoning failed");
    const empty = describeReasoning.execute({ steps: [], elapsedSeconds: 0 });
    expect(empty.state).toBe("idle");
    expect(empty.progressLabel).toBe("");
  });
});

describe("RunApprovalCountdown", () => {
  function setup(seconds = 5) {
    const clock = new FakeClock();
    const ticks: ApprovalCountdownTick[] = [];
    let expired = 0;
    const handle = new RunApprovalCountdown(clock).execute({
      seconds,
      onTick: (tick) => ticks.push(tick),
      onExpire: () => expired++,
    });
    return { clock, ticks, handle, expired: () => expired };
  }

  it("emite el estado inicial y vence al llegar a cero", () => {
    const { clock, ticks, expired } = setup(1);
    expect(ticks[0]).toEqual({
      remainingMs: 1000,
      fraction: 1,
      remainingSeconds: 1,
      paused: false,
    });
    clock.advance(600);
    expect(ticks[ticks.length - 1]!.remainingSeconds).toBe(1);
    clock.advance(400);
    expect(expired()).toBe(1);
    expect(clock.callbacks.size).toBe(0);
  });

  it("la pausa congela el tiempo restante", () => {
    const { clock, ticks, handle, expired } = setup(2);
    clock.advance(500);
    handle.pause();
    expect(ticks[ticks.length - 1]).toMatchObject({ remainingMs: 1500, paused: true });
    clock.advance(10_000);
    expect(expired()).toBe(0);
    handle.resume();
    clock.advance(1500);
    expect(expired()).toBe(1);
  });

  it("cancel detiene la cuenta sin vencer", () => {
    const { clock, handle, expired } = setup(1);
    handle.cancel();
    clock.advance(5000);
    expect(expired()).toBe(0);
    expect(clock.callbacks.size).toBe(0);
  });

  it("sin segundos no hay cuenta regresiva", () => {
    const { clock, ticks } = setup(0);
    expect(ticks).toEqual([]);
    expect(clock.callbacks.size).toBe(0);
  });
});
