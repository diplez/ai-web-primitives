// © 2026 Diego Lopez (diplez). All rights reserved.
import { buildIntentInstruction } from "../../../domain/intent/intent-prompts.js";
import {
  applyIntentEdit,
  intentChanges,
  normalizeIntent,
  toIntentInput,
  type Intent,
  type IntentChange,
  type IntentEdit,
  type IntentInput,
} from "../../../domain/intent/intent.js";

/** Resultado de revisar la interpretación: lo que la app le manda al modelo. */
export interface IntentReviewResult {
  /** La interpretación final (sin las fichas descartadas). */
  readonly intent: ReturnType<typeof toIntentInput>;
  /** Las correcciones del usuario. */
  readonly changes: readonly IntentChange[];
  /** Instrucción lista para el modelo, con las correcciones y la interpretación final. */
  readonly instruction: string;
}

/**
 * Caso de uso: guarda la interpretación del modelo y las correcciones del usuario, y arma lo
 * que se le devuelve al modelo al confirmar.
 */
export class ReviewIntent {
  private current: Intent = normalizeIntent(null);

  /** Empieza con una interpretación nueva del modelo. */
  start(input: IntentInput | null | undefined): Intent {
    this.current = normalizeIntent(input);
    return this.current;
  }

  get intent(): Intent {
    return this.current;
  }

  /** Aplica una corrección. Devuelve `true` si cambió algo. */
  apply(edit: IntentEdit): boolean {
    const next = applyIntentEdit(this.current, edit);
    if (next === this.current) return false;
    this.current = next;
    return true;
  }

  /** Descarta las correcciones y vuelve a la interpretación del modelo. */
  reset(): void {
    this.current = {
      ...this.current,
      goal: this.current.originalGoal,
      items: this.current.items
        .filter((item) => !item.added)
        .map((item) => ({ ...item, text: item.originalText, removed: false })),
    };
  }

  result(): IntentReviewResult {
    return {
      intent: toIntentInput(this.current),
      changes: intentChanges(this.current),
      instruction: buildIntentInstruction(this.current),
    };
  }
}
