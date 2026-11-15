/** Resultado de interpretar un JSON que puede estar incompleto. */
export interface PartialJson {
  /** El valor reconstruido (con lo que llegó hasta ahora). */
  readonly value: unknown;
  /** `true` si el texto ya es un JSON válido y completo. */
  readonly complete: boolean;
}

/** Límite de recortes al reparar: evita trabajo cuadrático con textos patológicos. */
const MAX_REPAIR_ATTEMPTS = 64;

/**
 * Interpreta un JSON que todavía está llegando en streaming (los argumentos de una llamada a
 * herramienta de OpenAI o Anthropic llegan así, carácter a carácter).
 *
 * Cierra strings, objetos y arrays abiertos y descarta lo que aún no se puede interpretar (una
 * clave sin valor, un literal a medias como `tru`). Devuelve `null` si todavía no hay ningún
 * valor reconocible.
 *
 * @example parsePartialJson('{"query": "pagin') // { value: { query: "pagin" }, complete: false }
 */
export function parsePartialJson(text: string): PartialJson | null {
  if (text.trim() === "") return null;
  try {
    return { value: JSON.parse(text) as unknown, complete: true };
  } catch {
    // Incompleto: se repara abajo.
  }

  // Primero el texto entero; si no alcanza, se recorta en cada punto estructural, del último al
  // primero. Las aperturas `{ [` se conservan (quedan vacías); comas y dos puntos se descartan.
  const candidates = [
    text,
    ...structuralPositions(text)
      .reverse()
      .map(({ index, char }) =>
        char === "{" || char === "[" ? text.slice(0, index + 1) : text.slice(0, index),
      ),
  ].slice(0, MAX_REPAIR_ATTEMPTS);

  for (const candidate of candidates) {
    const repaired = closeOpenStructures(candidate);
    if (repaired === null) continue;
    try {
      return { value: JSON.parse(repaired) as unknown, complete: false };
    } catch {
      // Sigue con un recorte más corto.
    }
  }
  return null;
}

interface StructuralPosition {
  readonly index: number;
  readonly char: string;
}

/** Posiciones de `{ [ , :` fuera de strings: los lugares donde es seguro recortar. */
function structuralPositions(text: string): StructuralPosition[] {
  const positions: StructuralPosition[] = [];
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[" || char === "," || char === ":") {
      positions.push({ index, char });
    }
  }
  return positions;
}

/**
 * Cierra el string abierto y las estructuras abiertas. Devuelve `null` si el texto termina en
 * un punto donde falta un valor (después de `:`), que no tiene un cierre razonable.
 */
function closeOpenStructures(text: string): string | null {
  const closers: string[] = [];
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") closers.push("}");
    else if (char === "[") closers.push("]");
    else if (char === "}" || char === "]") closers.pop();
  }

  let result = text;
  if (inString) {
    // Una barra invertida suelta al final no puede escapar al cierre.
    if (escaped) result = result.slice(0, -1);
    result += '"';
  }
  result = result.trimEnd();
  if (result.endsWith(",")) result = result.slice(0, -1);
  if (result.endsWith(":")) return null;
  return result + closers.reverse().join("");
}
