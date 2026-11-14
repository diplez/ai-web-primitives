import type { StreamEvent } from "../../../domain/stream/stream-event.js";
import type { FrameScheduler } from "../../ports/frame-scheduler.js";
import type { StreamEventSource } from "../../ports/stream-event-source.js";
import { StreamMarkdown } from "./stream-markdown.js";

class ManualFrames implements FrameScheduler {
  callback: ((now: number) => void) | null = null;
  start(onFrame: (now: number) => void): () => void {
    this.callback = onFrame;
    return () => {
      this.callback = null;
    };
  }
  frame(): void {
    this.callback?.(0);
  }
}

/** Fuente que entrega eventos pre-cargados; `frames.frame()` simula un frame entre eventos. */
function sourceOf(
  events: StreamEvent[],
  frames: ManualFrames,
  failWith?: unknown,
): StreamEventSource {
  return {
    async *open() {
      for (const event of events) {
        yield event;
        frames.frame();
      }
      if (failWith) throw failWith;
    },
  };
}

describe("StreamMarkdown", () => {
  it("acumula el texto y lo publica por frame y al final", async () => {
    const frames = new ManualFrames();
    const published: string[] = [];
    const result = await new StreamMarkdown(
      sourceOf(
        [
          { type: "text", delta: "Hola " },
          { type: "text", delta: "**mundo**" },
        ],
        frames,
      ),
      frames,
    ).execute({ source: null, onText: (text) => published.push(text) });

    expect(result).toEqual({ text: "Hola **mundo**", aborted: false });
    expect(published).toEqual(["Hola ", "Hola **mundo**", "Hola **mundo**"]);
    expect(frames.callback).toBeNull();
  });

  it("separa el razonamiento del texto", async () => {
    const frames = new ManualFrames();
    const reasoning: string[] = [];
    const result = await new StreamMarkdown(
      sourceOf(
        [
          { type: "reasoning", delta: "pienso" },
          { type: "text", delta: "respuesta" },
        ],
        frames,
      ),
      frames,
    ).execute({ source: null, onText: () => {}, onReasoning: (delta) => reasoning.push(delta) });

    expect(result.text).toBe("respuesta");
    expect(reasoning).toEqual(["pienso"]);
  });

  it("parte del texto inicial", async () => {
    const frames = new ManualFrames();
    const result = await new StreamMarkdown(
      sourceOf([{ type: "text", delta: "b" }], frames),
      frames,
    ).execute({ source: null, initialText: "a", onText: () => {} });
    expect(result.text).toBe("ab");
  });

  it("un abort termina sin error y publica lo recibido", async () => {
    const frames = new ManualFrames();
    const controller = new AbortController();
    const published: string[] = [];
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    const source: StreamEventSource = {
      async *open() {
        yield { type: "text", delta: "parcial" };
        controller.abort();
        throw abortError;
      },
    };

    const result = await new StreamMarkdown(source, frames).execute({
      source: null,
      signal: controller.signal,
      onText: (text) => published.push(text),
    });

    expect(result).toEqual({ text: "parcial", aborted: true });
    expect(published[published.length - 1]).toBe("parcial");
  });

  it("propaga los errores reales", async () => {
    const frames = new ManualFrames();
    await expect(
      new StreamMarkdown(sourceOf([], frames, new Error("red caída")), frames).execute({
        source: null,
        onText: () => {},
      }),
    ).rejects.toThrow("red caída");
    expect(frames.callback).toBeNull();
  });
});
