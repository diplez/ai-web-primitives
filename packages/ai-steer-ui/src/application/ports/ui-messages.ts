import type { DialPreset, DialPresetText } from "../../domain/dial/dial.js";

/**
 * Textos visibles de los componentes. Los marcadores `{nombre}` se reemplazan al mostrar.
 * Se pueden sobrescribir en cada `define*()`.
 */
export interface UiMessages {
  readonly answerDial: {
    /** Textos de las perillas incluidas. */
    readonly presets: Readonly<Record<DialPreset, DialPresetText>>;
    /** Posición de una perilla para lectores de pantalla: "{label}, {step} of {total}". */
    readonly position: string;
    /** Nombre de la posición central. */
    readonly original: string;
    readonly rewriting: string;
    readonly reset: string;
    /** Mensaje si la reescritura falla. */
    readonly failed: string;
  };
}
