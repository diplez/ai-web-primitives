import { ENGLISH_UI_MESSAGES, SPANISH_UI_MESSAGES } from "../../infrastructure/i18n/ui-messages.js";
import type { Clock } from "../ports/clock.js";
import { DescribeTimeline } from "./timeline/describe-timeline.js";
import { ReplayTimeline } from "./timeline/replay-timeline.js";
import { DescribeToolCall } from "./tool-call/describe-tool-call.js";

/** Reloj manual: `tick()` dispara los intervalos registrados. */
function manualClock(): Clock & { tick(): void; active(): number } {
  const callbacks = new Set<() => void>();
  return {
    now: () => 0,
    every(milliseconds, callback) {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
    tick: () => [...callbacks].forEach((callback) => callback()),
    active: () => callbacks.size,
  };
}

describe("DescribeToolCall", () => {
  const describeToolCall = new DescribeToolCall(SPANISH_UI_MESSAGES.toolCall);
  const base = { name: "search_docs", args: "", result: undefined, error: "", elapsedMs: null };

  it("muestra los argumentos en streaming mientras está pendiente", () => {
    const view = describeToolCall.execute({ ...base, status: "pending", args: '{"query": "pag' });
    expect(view.argsStreaming).toBe(true);
    expect(view.summary).toBe('query: "pag"');
    expect(view.args?.kind).toBe("json");
    expect(view.statusLabel).toBe("Preparando");
    expect(view.accessibleLabel).toBe("search_docs, Preparando");
  });

  it("deja de marcar streaming al ejecutar", () => {
    const view = describeToolCall.execute({ ...base, status: "running", args: '{"query": "pag' });
    expect(view.argsStreaming).toBe(false);
    expect(view.active).toBe(true);
  });

  it("resalta resultados JSON y deja el texto plano como texto", () => {
    const json = describeToolCall.execute({ ...base, status: "success", result: '{"total": 3}' });
    expect(json.result?.kind).toBe("json");
    const text = describeToolCall.execute({ ...base, status: "success", result: "3 resultados" });
    expect(text.result).toEqual({ kind: "text", text: "3 resultados" });
  });

  it("formatea la duración solo si se conoce", () => {
    expect(describeToolCall.execute({ ...base, status: "success" }).durationLabel).toBe("");
    expect(
      describeToolCall.execute({ ...base, status: "success", elapsedMs: 1500 }).durationLabel,
    ).toBe("1.5 s");
  });

  it("expone los títulos de sección traducidos", () => {
    expect(describeToolCall.execute({ ...base, status: "error", error: "x" }).labels).toEqual({
      arguments: "Argumentos",
      result: "Resultado",
      error: "Error",
    });
  });
});

describe("DescribeTimeline", () => {
  const describeTimeline = new DescribeTimeline(ENGLISH_UI_MESSAGES.timeline);
  const events = [
    { title: "Read", at: 1_000 },
    { kind: "tool", title: "Search", at: 8_000 },
    { kind: "file", title: "Write", at: 43_000 },
  ];

  it("en vivo, el actual es el último", () => {
    const view = describeTimeline.execute({ events, cursor: null });
    expect(view.live).toBe(true);
    expect(view.currentIndex).toBe(2);
    expect(view.positionLabel).toBe("Live");
    expect(view.items.map((item) => item.placement)).toEqual(["past", "past", "current"]);
  });

  it("con cursor, marca pasado, actual y futuro", () => {
    const view = describeTimeline.execute({ events, cursor: 1 });
    expect(view.live).toBe(false);
    expect(view.positionLabel).toBe("Step 2 of 3");
    expect(view.items.map((item) => item.placement)).toEqual(["past", "current", "future"]);
  });

  it("calcula desplazamientos y duración total desde el primer evento", () => {
    const view = describeTimeline.execute({ events, cursor: null });
    expect(view.items.map((item) => item.offsetLabel)).toEqual(["+0:00", "+0:07", "+0:42"]);
    expect(view.totalLabel).toBe("0:42");
    expect(view.countLabel).toBe("3 events");
    expect(view.items[1]?.kindLabel).toBe("Tool");
  });

  it("sin marcas de tiempo no muestra desplazamientos", () => {
    const view = describeTimeline.execute({ events: ["a", "b"], cursor: null });
    expect(view.items.every((item) => item.offsetLabel === "")).toBe(true);
    expect(view.totalLabel).toBe("");
  });

  it("vacía", () => {
    const view = describeTimeline.execute({ events: [], cursor: null });
    expect(view.currentIndex).toBeNull();
    expect(view.countLabel).toBe("0 events");
  });

  it("un solo evento usa el singular", () => {
    expect(describeTimeline.execute({ events: ["a"], cursor: null }).countLabel).toBe("1 event");
  });
});

describe("ReplayTimeline", () => {
  it("recorre los eventos y termina en el último", () => {
    const clock = manualClock();
    const steps: number[] = [];
    const onEnd = vi.fn();
    new ReplayTimeline(clock).execute({
      from: 0,
      count: 3,
      intervalMs: 500,
      onStep: (index) => steps.push(index),
      onEnd,
    });
    clock.tick();
    clock.tick();
    expect(steps).toEqual([0, 1, 2]);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(clock.active()).toBe(0);
  });

  it("si ya está en el último, empieza desde el principio", () => {
    const clock = manualClock();
    const steps: number[] = [];
    new ReplayTimeline(clock).execute({
      from: 2,
      count: 3,
      intervalMs: 500,
      onStep: (index) => steps.push(index),
      onEnd: () => {},
    });
    expect(steps).toEqual([0]);
  });

  it("se puede detener", () => {
    const clock = manualClock();
    const onEnd = vi.fn();
    const stop = new ReplayTimeline(clock).execute({
      from: 0,
      count: 5,
      intervalMs: 500,
      onStep: () => {},
      onEnd,
    });
    stop();
    clock.tick();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("sin eventos termina de inmediato", () => {
    const onEnd = vi.fn();
    new ReplayTimeline(manualClock()).execute({
      from: 0,
      count: 0,
      intervalMs: 500,
      onStep: () => {},
      onEnd,
    });
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
