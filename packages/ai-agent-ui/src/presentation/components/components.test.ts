import type { Clock } from "../../application/ports/clock.js";
import { DescribeTimeline } from "../../application/use-cases/timeline/describe-timeline.js";
import { ReplayTimeline } from "../../application/use-cases/timeline/replay-timeline.js";
import { DescribeToolCall } from "../../application/use-cases/tool-call/describe-tool-call.js";
import { ENGLISH_UI_MESSAGES } from "../../infrastructure/i18n/ui-messages.js";
import { DzAgentTimeline } from "./agent-timeline/dz-agent-timeline.js";
import { DzToolCall } from "./tool-call/dz-tool-call.js";

class FakeClock implements Clock {
  time = 0;
  callbacks = new Map<() => void, number>();
  now(): number {
    return this.time;
  }
  every(milliseconds: number, callback: () => void): () => void {
    this.callbacks.set(callback, milliseconds);
    return () => this.callbacks.delete(callback);
  }
  /** Avanza el tiempo disparando cada intervalo según su período. */
  advance(milliseconds: number): void {
    const target = this.time + milliseconds;
    while (this.time < target) {
      this.time = Math.min(target, this.time + 100);
      for (const [callback, period] of [...this.callbacks]) {
        if (this.time % period === 0) callback();
      }
    }
  }
}

const clock = new FakeClock();

class TestToolCall extends DzToolCall {
  static override dependencies = {
    describeToolCall: new DescribeToolCall(ENGLISH_UI_MESSAGES.toolCall),
    clock,
  };
}
class TestTimeline extends DzAgentTimeline {
  static override dependencies = {
    describeTimeline: new DescribeTimeline(ENGLISH_UI_MESSAGES.timeline),
    replayTimeline: new ReplayTimeline(clock),
    clock,
    messages: ENGLISH_UI_MESSAGES.timeline,
  };
}
customElements.define("test-tool-call", TestToolCall);
customElements.define("test-timeline", TestTimeline);

async function mount<T extends HTMLElement & { updateComplete: Promise<boolean> }>(
  markup: string,
  selector: string,
): Promise<T> {
  document.body.innerHTML = markup;
  const element = document.querySelector<T>(selector)!;
  await element.updateComplete;
  return element;
}

const text = (element: HTMLElement, selector: string): string =>
  element.shadowRoot!.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";

describe("DzToolCall", () => {
  beforeEach(() => {
    clock.time = 0;
    clock.callbacks.clear();
  });

  it("muestra nombre, resumen y estado", async () => {
    const element = await mount<TestToolCall>(
      `<test-tool-call name="search_docs" args='{"query":"pagination"}' status="running"></test-tool-call>`,
      "test-tool-call",
    );
    expect(text(element, ".name")).toBe("search_docs");
    expect(text(element, ".summary")).toBe('query: "pagination"');
    expect(text(element, ".status")).toBe("Running");
    expect(text(element, "[role=status]")).toBe("search_docs, Running");
  });

  it("muestra los argumentos en streaming con cursor y resaltado", async () => {
    const element = await mount<TestToolCall>(
      `<test-tool-call name="search_docs"></test-tool-call>`,
      "test-tool-call",
    );
    element.appendArgs('{"query": "pag');
    await element.updateComplete;
    const code = element.shadowRoot!.querySelector("pre")!;
    expect(code.textContent).toContain('"query": "pag"');
    expect(code.querySelector(".t-key")?.textContent).toBe('"query"');
    expect(code.querySelector(".caret")).not.toBeNull();

    element.appendArgs('ination"}');
    element.run();
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".caret")).toBeNull();
  });

  it("mide la duración desde que está activa hasta que termina", async () => {
    const element = await mount<TestToolCall>(
      `<test-tool-call name="read_file" status="running"></test-tool-call>`,
      "test-tool-call",
    );
    clock.advance(1200);
    await element.updateComplete;
    expect(text(element, ".meta")).toContain("1.2 s");

    element.complete({ lines: 42 });
    await element.updateComplete;
    clock.advance(3000);
    await element.updateComplete;
    expect(text(element, ".meta")).toContain("1.2 s");
    expect(element.status).toBe("success");
    expect(clock.callbacks.size).toBe(0);
    expect(element.shadowRoot!.textContent).toContain('"lines"');
  });

  it("una llamada que ya llega terminada no muestra duración, salvo que se indique", async () => {
    const element = await mount<TestToolCall>(
      `<test-tool-call name="x" status="success"></test-tool-call>`,
      "test-tool-call",
    );
    expect(text(element, ".meta")).toBe("Done");
    element.duration = 2500;
    await element.updateComplete;
    expect(text(element, ".meta")).toContain("2.5 s");
  });

  it("muestra el error", async () => {
    const element = await mount<TestToolCall>(
      `<test-tool-call name="x" status="running"></test-tool-call>`,
      "test-tool-call",
    );
    element.fail("Timeout after 30 s");
    await element.updateComplete;
    expect(element.getAttribute("status")).toBe("error");
    expect(text(element, ".error")).toBe("Timeout after 30 s");
  });

  it("emite dz-toggle al abrir", async () => {
    const element = await mount<TestToolCall>(
      `<test-tool-call name="x"></test-tool-call>`,
      "test-tool-call",
    );
    const listener = vi.fn();
    element.addEventListener("dz-toggle", listener);
    const details = element.shadowRoot!.querySelector("details")!;
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    expect(listener).toHaveBeenCalledOnce();
    expect(element.open).toBe(true);
  });

  it("reset vuelve al estado inicial", async () => {
    const element = await mount<TestToolCall>(
      `<test-tool-call name="x" args='{"a":1}' status="success"></test-tool-call>`,
      "test-tool-call",
    );
    element.reset();
    await element.updateComplete;
    expect(element.status).toBe("pending");
    expect(element.shadowRoot!.querySelector("pre")).toBeNull();
  });
});

describe("DzAgentTimeline", () => {
  beforeEach(() => {
    clock.time = 0;
    clock.callbacks.clear();
  });

  async function timelineWith(count: number): Promise<TestTimeline> {
    const element = await mount<TestTimeline>(
      `<test-timeline forkable></test-timeline>`,
      "test-timeline",
    );
    for (let index = 0; index < count; index++) {
      clock.time = index * 5000;
      element.addEvent({ kind: index === 1 ? "tool" : "message", title: `Event ${index}` });
    }
    await element.updateComplete;
    return element;
  }

  const placements = (element: HTMLElement): (string | null)[] =>
    [...element.shadowRoot!.querySelectorAll("li")].map((li) => li.dataset["placement"] ?? null);

  it("muestra el estado vacío", async () => {
    const element = await mount<TestTimeline>(`<test-timeline></test-timeline>`, "test-timeline");
    expect(text(element, ".empty")).toBe("No activity yet");
  });

  it("acepta eventos por atributo JSON", async () => {
    const element = await mount<TestTimeline>(
      `<test-timeline events='[{"kind":"tool","title":"Search"},"Answer"]'></test-timeline>`,
      "test-timeline",
    );
    expect(element.shadowRoot!.querySelectorAll("li")).toHaveLength(2);
    expect(text(element, ".stats")).toBe("2 events");
  });

  it("en vivo sigue al último evento y muestra la duración", async () => {
    const element = await timelineWith(3);
    expect(element.live).toBe(true);
    expect(placements(element)).toEqual(["past", "past", "current"]);
    expect(text(element, ".position")).toBe("Live");
    expect(text(element, ".stats")).toBe("3 events · 0:10");
  });

  it("al rebobinar marca el futuro y emite dz-select", async () => {
    const element = await timelineWith(3);
    const listener = vi.fn();
    element.addEventListener("dz-select", listener);
    const range = element.shadowRoot!.querySelector<HTMLInputElement>("input[type=range]")!;
    range.value = "0";
    range.dispatchEvent(new Event("input"));
    await element.updateComplete;

    expect(element.live).toBe(false);
    expect(placements(element)).toEqual(["current", "future", "future"]);
    expect(text(element, ".position")).toBe("Step 1 of 3");
    expect(listener.mock.calls[0]![0].detail).toMatchObject({ index: 0, live: false });
  });

  it("los eventos nuevos no mueven el cursor fijado", async () => {
    const element = await timelineWith(3);
    element.select(1);
    element.addEvent("Later");
    await element.updateComplete;
    expect(placements(element)).toEqual(["past", "current", "future", "future"]);
  });

  it("vuelve a en vivo", async () => {
    const element = await timelineWith(3);
    element.select(0);
    await element.updateComplete;
    const back = [...element.shadowRoot!.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Jump to latest",
    )!;
    back.click();
    await element.updateComplete;
    expect(element.live).toBe(true);
    expect(placements(element)).toEqual(["past", "past", "current"]);
  });

  it("bifurca desde el evento elegido", async () => {
    const element = await timelineWith(3);
    element.select(1);
    await element.updateComplete;
    const listener = vi.fn();
    element.addEventListener("dz-fork", listener);
    element.shadowRoot!.querySelector<HTMLButtonElement>(".fork")!.click();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0].detail).toMatchObject({
      index: 1,
      event: { kind: "tool", title: "Event 1" },
    });
  });

  it("sin forkable no muestra el botón", async () => {
    const element = await timelineWith(2);
    element.forkable = false;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".fork")).toBeNull();
  });

  it("repite la ejecución y termina en vivo", async () => {
    const element = await timelineWith(3);
    element.replayInterval = 500;
    element.replay();
    await element.updateComplete;
    expect(placements(element)).toEqual(["current", "future", "future"]);
    clock.advance(500);
    await element.updateComplete;
    expect(placements(element)).toEqual(["past", "current", "future"]);
    clock.advance(500);
    await element.updateComplete;
    expect(element.live).toBe(true);
    expect(clock.callbacks.size).toBe(0);
  });

  it("updateEvent cambia el estado de un evento", async () => {
    const element = await mount<TestTimeline>(`<test-timeline></test-timeline>`, "test-timeline");
    const id = element.addEvent({ kind: "tool", title: "Search", status: "running" });
    element.updateEvent(id, { status: "done", detail: "3 results" });
    await element.updateComplete;
    const item = element.shadowRoot!.querySelector("li")!;
    expect(item.dataset["status"]).toBe("done");
    expect(item.textContent).toContain("3 results");
  });
});
