/** Perillas incluidas: el consumidor puede usarlas por nombre (`dials='["length","tone"]'`). */
export const DIAL_PRESETS = ["length", "level", "tone"] as const;
export type DialPreset = (typeof DIAL_PRESETS)[number];

/** Textos de una perilla incluida (vienen del idioma elegido). */
export interface DialPresetText {
  /** Etiqueta del extremo izquierdo, en la interfaz ("Shorter"). */
  readonly start: string;
  /** Etiqueta del extremo derecho ("Longer"). */
  readonly end: string;
}

/**
 * Una perilla ya normalizada. El paso central (`center`) es la respuesta original; hacia la
 * izquierda se acerca a `start` y hacia la derecha a `end`.
 */
export interface Dial {
  readonly id: string;
  readonly start: string;
  readonly end: string;
  /** Cómo se le pide al modelo ir hacia cada extremo ("shorter", "more technical"). */
  readonly startHint: string;
  readonly endHint: string;
  /** Cantidad de posiciones (impar, de 3 a 9). */
  readonly steps: number;
  readonly center: number;
}

/** Lo que acepta la API pública: el nombre de una perilla incluida o una definición propia. */
export type DialInput =
  | DialPreset
  | {
      readonly id: string;
      readonly start: string;
      readonly end: string;
      readonly startHint?: string;
      readonly endHint?: string;
      readonly steps?: number;
    };

/** Pistas en inglés para el modelo: los LLM entienden mejor instrucciones en inglés. */
const PRESET_HINTS: Readonly<Record<DialPreset, { start: string; end: string }>> = {
  length: { start: "shorter", end: "longer and more detailed" },
  level: { start: "simpler, for a non-expert", end: "more technical, for an expert" },
  tone: { start: "more casual", end: "more formal" },
};

export const DEFAULT_DIALS: readonly DialPreset[] = ["length", "level"];
const DEFAULT_STEPS = 5;
const MIN_STEPS = 3;
const MAX_STEPS = 9;

export function isDialPreset(value: unknown): value is DialPreset {
  return typeof value === "string" && (DIAL_PRESETS as readonly string[]).includes(value);
}

/** Cantidad de pasos válida: impar (para que exista el centro) y entre 3 y 9. */
export function normalizeSteps(steps: unknown): number {
  const value =
    typeof steps === "number" && Number.isFinite(steps) ? Math.round(steps) : DEFAULT_STEPS;
  const clamped = Math.min(MAX_STEPS, Math.max(MIN_STEPS, value));
  return clamped % 2 === 0 ? clamped + 1 : clamped;
}

/**
 * Normaliza las perillas pedidas. Las desconocidas se ignoran y los ids repetidos se descartan.
 * Sin perillas válidas se usan las por defecto.
 */
export function normalizeDials(
  inputs: readonly DialInput[] | undefined,
  presetText: Readonly<Record<DialPreset, DialPresetText>>,
): Dial[] {
  const dials: Dial[] = [];
  for (const input of inputs && inputs.length > 0 ? inputs : DEFAULT_DIALS) {
    const dial = toDial(input, presetText);
    if (dial && !dials.some((existing) => existing.id === dial.id)) dials.push(dial);
  }
  return dials.length > 0 ? dials : DEFAULT_DIALS.map((preset) => toDial(preset, presetText)!);
}

function toDial(
  input: DialInput,
  presetText: Readonly<Record<DialPreset, DialPresetText>>,
): Dial | null {
  if (isDialPreset(input)) {
    const steps = DEFAULT_STEPS;
    return {
      id: input,
      ...presetText[input],
      startHint: PRESET_HINTS[input].start,
      endHint: PRESET_HINTS[input].end,
      steps,
      center: (steps - 1) / 2,
    };
  }
  if (typeof input !== "object" || input === null || !input.id || !input.start || !input.end) {
    return null;
  }
  const steps = normalizeSteps(input.steps);
  return {
    id: input.id,
    start: input.start,
    end: input.end,
    startHint: input.startHint ?? input.start.toLowerCase(),
    endHint: input.endHint ?? input.end.toLowerCase(),
    steps,
    center: (steps - 1) / 2,
  };
}

/** Posición de cada perilla por id. */
export type DialValues = Readonly<Record<string, number>>;

/** Valores ajustados a cada perilla; los que faltan quedan en el centro (la respuesta original). */
export function normalizeValues(
  dials: readonly Dial[],
  values: DialValues | undefined,
): DialValues {
  const result: Record<string, number> = {};
  for (const dial of dials) {
    const raw = values?.[dial.id];
    result[dial.id] =
      typeof raw === "number" && Number.isFinite(raw)
        ? Math.min(dial.steps - 1, Math.max(0, Math.round(raw)))
        : dial.center;
  }
  return result;
}

/** `true` si todas las perillas están en el centro (se muestra la respuesta original). */
export function isOriginal(dials: readonly Dial[], values: DialValues): boolean {
  return dials.every((dial) => values[dial.id] === dial.center);
}

/** Clave estable para cachear el texto de una combinación de posiciones. */
export function valuesKey(dials: readonly Dial[], values: DialValues): string {
  return dials.map((dial) => `${dial.id}=${values[dial.id] ?? dial.center}`).join("&");
}
