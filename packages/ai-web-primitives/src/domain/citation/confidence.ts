/**
 * Normaliza un nivel de confianza a [0, 1]. Acepta fracciones (`0.87`), porcentajes
 * (`87`, `"87%"`) y strings numéricos. Devuelve `null` si no es un número.
 */
export function normalizeConfidence(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const percent = text.endsWith("%");
  const number = Number.parseFloat(text);
  if (!Number.isFinite(number)) return null;
  const fraction = percent || number > 1 ? number / 100 : number;
  return Math.min(1, Math.max(0, fraction));
}

/** Porcentaje entero para mostrar. */
export const confidencePercent = (confidence: number): number => Math.round(confidence * 100);
