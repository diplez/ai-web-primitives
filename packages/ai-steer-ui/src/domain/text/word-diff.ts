/** Cómo cambia cada fragmento entre dos versiones del texto. */
export type DiffOp = "keep" | "insert" | "delete";

/**
 * Un fragmento: una palabra con el espacio que la sigue (`"hola "`, `"mundo.\n\n"`). Se compara
 * solo por la palabra, así un cambio de espaciado no cuenta como palabra distinta.
 */
export interface DiffToken {
  readonly text: string;
  readonly op: DiffOp;
}

/** Por encima de este tamaño (palabras × palabras) se reemplaza todo: el diff sería costoso. */
const MAX_DIFF_CELLS = 4_000_000;

/** Divide un texto en fragmentos `palabra + espacio`. Un espacio inicial queda como fragmento propio. */
export function splitWords(text: string): string[] {
  return text.match(/^\s+|\S+\s*/g) ?? [];
}

const wordOf = (segment: string): string => segment.trimEnd();

/**
 * Compara dos textos palabra por palabra (subsecuencia común más larga) y devuelve los
 * fragmentos en orden de lectura: los conservados (con el espaciado del texto nuevo), los
 * borrados del texto anterior y los nuevos.
 */
export function diffWords(before: string, after: string): DiffToken[] {
  const a = splitWords(before);
  const b = splitWords(after);
  if (a.length * b.length > MAX_DIFF_CELLS) {
    return [
      ...a.map((text) => ({ text, op: "delete" as const })),
      ...b.map((text) => ({ text, op: "insert" as const })),
    ];
  }

  // Tabla de la subsecuencia común más larga, calculada desde el final.
  const cols = b.length + 1;
  const table = new Uint32Array((a.length + 1) * cols);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * cols + j] =
        wordOf(a[i]!) === wordOf(b[j]!)
          ? table[(i + 1) * cols + j + 1]! + 1
          : Math.max(table[(i + 1) * cols + j]!, table[i * cols + j + 1]!);
    }
  }

  const output: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (wordOf(a[i]!) === wordOf(b[j]!)) {
      output.push({ text: b[j]!, op: "keep" });
      i++;
      j++;
    } else if (table[(i + 1) * cols + j]! >= table[i * cols + j + 1]!) {
      output.push({ text: a[i]!, op: "delete" });
      i++;
    } else {
      output.push({ text: b[j]!, op: "insert" });
      j++;
    }
  }
  while (i < a.length) output.push({ text: a[i++]!, op: "delete" });
  while (j < b.length) output.push({ text: b[j++]!, op: "insert" });
  return output;
}

/** Proporción de palabras que cambiaron respecto del texto nuevo (0 = idéntico, 1 = todo distinto). */
export function changeRatio(diff: readonly DiffToken[]): number {
  const visible = diff.filter((token) => token.op !== "delete");
  if (visible.length === 0) return diff.length === 0 ? 0 : 1;
  return visible.filter((token) => token.op === "insert").length / visible.length;
}
