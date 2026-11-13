import { ORB_PROFILES } from "../../../domain/orb/orb-profile.js";
import type { OrbFrameDto } from "../../dtos/orb-frame-dto.js";
import type { FrameScheduler } from "../../ports/frame-scheduler.js";
import type { MotionPreference } from "../../ports/motion-preference.js";
import { AnimateThinkingOrb } from "./animate-thinking-orb.js";

class FakeFrameScheduler implements FrameScheduler {
  onFrame: ((now: number) => void) | null = null;
  starts = 0;

  start(onFrame: (now: number) => void): () => void {
    this.starts++;
    this.onFrame = onFrame;
    return () => {
      this.onFrame = null;
    };
  }

  tick(now: number): void {
    this.onFrame?.(now);
  }

  get running(): boolean {
    return this.onFrame !== null;
  }
}

class FakeMotionPreference implements MotionPreference {
  listeners = new Set<(reduced: boolean) => void>();
  constructor(public reduced = false) {}

  prefersReducedMotion(): boolean {
    return this.reduced;
  }

  subscribe(onChange: (reduced: boolean) => void): () => void {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  change(reduced: boolean): void {
    this.reduced = reduced;
    for (const listener of this.listeners) listener(reduced);
  }
}

function setup(reduced = false) {
  const scheduler = new FakeFrameScheduler();
  const motion = new FakeMotionPreference(reduced);
  const frames: OrbFrameDto[] = [];
  const handle = new AnimateThinkingOrb(scheduler, motion).execute({
    phase: "idle",
    onFrame: (frame) => frames.push(frame),
  });
  const last = () => frames[frames.length - 1]!;
  return { scheduler, motion, frames, handle, last };
}

describe("AnimateThinkingOrb", () => {
  it("emite un primer frame de inmediato y arranca el bucle", () => {
    const { scheduler, frames, last } = setup();
    expect(frames).toHaveLength(1);
    expect(last().phase).toBe("idle");
    expect(scheduler.running).toBe(true);
  });

  it("emite un frame por cada tick", () => {
    const { scheduler, frames } = setup();
    scheduler.tick(1);
    scheduler.tick(1.016);
    expect(frames).toHaveLength(3);
  });

  it("transiciona suavemente al cambiar de fase", () => {
    const { scheduler, handle, last } = setup();
    scheduler.tick(10);
    handle.setPhase("generating");
    scheduler.tick(10.45);
    const middle = last();
    expect(middle.phase).toBe("generating");
    expect(middle.glow).toBeGreaterThan(ORB_PROFILES.idle.glow);
    expect(middle.glow).toBeLessThan(ORB_PROFILES.generating.glow);
    expect(middle.pulse).not.toBeNull();

    scheduler.tick(20);
    expect(last().glow).toBeCloseTo(ORB_PROFILES.generating.glow);
    expect(last().pulse).toBeNull();
  });

  it("normaliza fases inválidas a idle", () => {
    const { scheduler, handle, last } = setup();
    handle.setPhase("searching");
    handle.setPhase("nope");
    scheduler.tick(50);
    expect(last().phase).toBe("idle");
  });

  it("aplica la paleta del consumidor", () => {
    const { scheduler, handle, last } = setup();
    handle.setPhase("done", { hue: 10 });
    scheduler.tick(50);
    expect(last().hue).toBeCloseTo(10);
  });

  it("se pausa cuando no es visible y se reanuda al volver", () => {
    const { scheduler, handle } = setup();
    handle.setVisible(false);
    expect(scheduler.running).toBe(false);
    handle.setVisible(true);
    expect(scheduler.running).toBe(true);
    expect(scheduler.starts).toBe(2);
  });

  describe("con movimiento reducido", () => {
    it("no usa el scheduler y pinta la pose de reposo", () => {
      const { scheduler, frames, last } = setup(true);
      expect(scheduler.running).toBe(false);
      expect(frames).toHaveLength(1);
      expect(last().trails).toEqual([]);
      expect(last().pulse).toBeNull();
    });

    it("cada cambio de fase pinta el destino al instante", () => {
      const { handle, frames, last } = setup(true);
      handle.setPhase("generating");
      expect(frames).toHaveLength(2);
      expect(last().glow).toBe(ORB_PROFILES.generating.glow);
    });
  });

  it("reacciona en vivo a cambios de la preferencia de movimiento", () => {
    const { scheduler, motion, frames } = setup();
    motion.change(true);
    expect(scheduler.running).toBe(false);
    expect(frames).toHaveLength(2);
    motion.change(false);
    expect(scheduler.running).toBe(true);
  });

  it("stop detiene el bucle, cancela suscripciones e ignora cambios posteriores", () => {
    const { scheduler, motion, handle, frames } = setup();
    handle.stop();
    expect(scheduler.running).toBe(false);
    expect(motion.listeners.size).toBe(0);
    handle.setPhase("generating");
    expect(frames).toHaveLength(1);
  });
});
