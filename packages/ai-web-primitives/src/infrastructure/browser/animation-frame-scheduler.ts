import type { FrameScheduler } from "../../application/ports/frame-scheduler.js";

/** Adaptador de `FrameScheduler` sobre `requestAnimationFrame` (se pausa solo en pestañas ocultas). */
export class AnimationFrameScheduler implements FrameScheduler {
  start(onFrame: (nowSeconds: number) => void): () => void {
    let active = true;
    let frameId = 0;

    const loop = (timestamp: number): void => {
      if (!active) return;
      onFrame(timestamp / 1000);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }
}
