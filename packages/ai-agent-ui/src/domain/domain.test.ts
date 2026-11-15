import {
  clampEventIndex,
  countEventKinds,
  normalizeAgentEvents,
  toAgentEventKind,
} from "./timeline/agent-event.js";
import {
  isToolCallActive,
  readToolArguments,
  summarizeToolArguments,
  toToolCallStatus,
} from "./tool-call/tool-call.js";

describe("tool-call", () => {
  it("normaliza el estado", () => {
    expect(toToolCallStatus("running")).toBe("running");
    expect(toToolCallStatus("sleeping")).toBe("pending");
    expect(isToolCallActive("pending")).toBe(true);
    expect(isToolCallActive("success")).toBe(false);
  });

  it("lee argumentos vacíos, objetos, JSON incompleto y texto plano", () => {
    expect(readToolArguments("")).toEqual({ value: undefined, complete: true, empty: true });
    expect(readToolArguments({ a: 1 })).toEqual({ value: { a: 1 }, complete: true, empty: false });
    expect(readToolArguments('{"a": "x')).toEqual({
      value: { a: "x" },
      complete: false,
      empty: false,
    });
    expect(readToolArguments("rm -rf build/")).toEqual({
      value: "rm -rf build/",
      complete: true,
      empty: false,
    });
  });

  it("resume con el primer valor simple", () => {
    expect(summarizeToolArguments({ options: {}, query: "paginación  por\ncursor" })).toBe(
      'query: "paginación por cursor"',
    );
    expect(summarizeToolArguments({ limit: 5 })).toBe("limit: 5");
    expect(summarizeToolArguments([1, 2, 3])).toBe("[3]");
    expect(summarizeToolArguments({ nested: { a: 1 } })).toBe("");
    expect(summarizeToolArguments("x".repeat(100))).toHaveLength(60);
  });
});

describe("agent-event", () => {
  it("normaliza strings y objetos con valores por defecto", () => {
    const events = normalizeAgentEvents([
      "Leer",
      { kind: "error", title: "Falló" },
      { id: "x", kind: "tool", title: "Buscar", at: 10, status: "running" },
    ]);
    expect(events[0]).toEqual({
      id: "event-0",
      kind: "message",
      title: "Leer",
      detail: "",
      at: null,
      status: "done",
    });
    expect(events[1]?.status).toBe("error");
    expect(events[2]).toMatchObject({ id: "x", kind: "tool", at: 10, status: "running" });
  });

  it("los tipos desconocidos pasan a message", () => {
    expect(toAgentEventKind("weird")).toBe("message");
  });

  it("ajusta índices al rango", () => {
    expect(clampEventIndex(5, 0)).toBeNull();
    expect(clampEventIndex(-2, 3)).toBe(0);
    expect(clampEventIndex(9, 3)).toBe(2);
    expect(clampEventIndex(Number.NaN, 3)).toBe(2);
  });

  it("cuenta eventos por tipo", () => {
    const counts = countEventKinds(normalizeAgentEvents([{ kind: "tool", title: "a" }, "b"]));
    expect(counts.tool).toBe(1);
    expect(counts.message).toBe(1);
    expect(counts.error).toBe(0);
  });
});
