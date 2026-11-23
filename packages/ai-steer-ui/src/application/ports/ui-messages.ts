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
  readonly intentLens: {
    readonly heading: string;
    readonly goal: string;
    readonly constraints: string;
    readonly assumptions: string;
    readonly add: string;
    readonly addConstraint: string;
    readonly addAssumption: string;
    readonly writeOwn: string;
    readonly remove: string;
    readonly restore: string;
    /** "Back to “{text}”": vuelve al texto original de una ficha. */
    readonly keepOriginal: string;
    readonly unsure: string;
    readonly unsureHint: string;
    readonly editGoal: string;
    readonly question: string;
    /** "{count} corrections". */
    readonly changes: string;
    readonly oneChange: string;
    readonly reset: string;
    readonly confirm: string;
    readonly confirmWithChanges: string;
    readonly confirmed: string;
    readonly reopen: string;
  };
}
