import { diffWords, type DiffToken } from "../../../domain/text/word-diff.js";

/** Duraciones de la transición entre dos versiones del texto, en ms. */
export const MORPH_TIMING = {
  /** Las palabras que se van se desvanecen. */
  leave: 180,
  /** Retraso máximo acumulado entre palabras nuevas (efecto cascada). */
  stagger: 320,
  /** Duración de la aparición de cada palabra nueva. */
  enter: 320,
} as const;

/** Pasos de la transición: primero se van las palabras borradas, después entran las nuevas. */
export interface MorphPlan {
  /** Texto anterior con las palabras que se van marcadas como `delete`. */
  readonly leaving: readonly DiffToken[];
  /** Texto nuevo con las palabras que llegan marcadas como `insert` y su retraso. */
  readonly entering: readonly (DiffToken & { readonly delay: number })[];
  /** `true` si no hay nada que animar (textos iguales o sin movimiento). */
  readonly instant: boolean;
}

/**
 * Caso de uso: planifica la transición palabra por palabra entre dos versiones de la respuesta.
 * Con movimiento reducido, o si no cambia nada, la transición es instantánea.
 */
export function planMorph(before: string, after: string, reducedMotion: boolean): MorphPlan {
  const diff = diffWords(before, after);
  const changed = diff.some((token) => token.op !== "keep");
  const entering = diff.filter((token) => token.op !== "delete");
  const inserted = entering.filter((token) => token.op === "insert").length;
  const step = inserted > 1 ? MORPH_TIMING.stagger / inserted : 0;
  let order = 0;
  return {
    leaving: diff.filter((token) => token.op !== "insert"),
    entering: entering.map((token) => ({
      ...token,
      delay: token.op === "insert" ? Math.round(step * order++) : 0,
    })),
    instant: reducedMotion || !changed || before === "",
  };
}
