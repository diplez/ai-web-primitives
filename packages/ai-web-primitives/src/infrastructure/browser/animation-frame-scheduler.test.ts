import { AnimationFrameScheduler } from "./animation-frame-scheduler.js";

describe("AnimationFrameScheduler", () => {
  let callbacks: Map<number, FrameRequestCallback>;
  let nextId: number;

  beforeEach(() => {
    callbacks = new Map();
    nextId = 1;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.set(nextId, callback);
      return nextId++;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  });

  afterEach(() => vi.unstubAllGlobals());

  const flush = (timestamp: number) => {
    const pending = [...callbacks.entries()];
    callbacks.clear();
    for (const [, callback] of pending) callback(timestamp);
  };

  it("entrega el tiempo en segundos en cada frame", () => {
    const received: number[] = [];
    new AnimationFrameScheduler().start((now) => received.push(now));
    flush(1000);
    flush(1500);
    expect(received).toEqual([1, 1.5]);
  });

  it("deja de llamar después de detenerse", () => {
    const received: number[] = [];
    const stop = new AnimationFrameScheduler().start((now) => received.push(now));
    flush(1000);
    stop();
    flush(2000);
    expect(received).toEqual([1]);
    expect(callbacks.size).toBe(0);
  });
});
