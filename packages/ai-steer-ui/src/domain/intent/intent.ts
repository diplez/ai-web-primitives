// © 2026 Diego Lopez (diplez). All rights reserved.

/** Tipos de ficha que muestra la lente. */
export type IntentItemKind = "constraint" | "assumption";

/** Una restricción o suposición ya normalizada. */
export interface IntentItem {
  readonly id: string;
  readonly kind: IntentItemKind;
  /** Texto actual (puede haberlo cambiado el usuario). */
  readonly text: string;
  /** Texto con el que llegó del modelo (`""` si lo agregó el usuario). */
  readonly originalText: string;
  /** Alternativas sugeridas por el modelo (solo suposiciones). */
  readonly options: readonly string[];
  /** Confianza del modelo, de 0 a 1, o `null` si no la indicó. */
  readonly confidence: number | null;
  /** El usuario la descartó. */
  readonly removed: boolean;
  /** La agregó el usuario. */
  readonly added: boolean;
}

/** La interpretación completa: objetivo, restricciones y suposiciones. */
export interface Intent {
  readonly goal: string;
  readonly originalGoal: string;
  readonly items: readonly IntentItem[];
}

/** Lo que acepta la API pública (y lo que se le pide al modelo que devuelva). */
export interface IntentInput {
  readonly goal?: string;
  readonly constraints?: readonly (string | { readonly text: string })[];
  readonly assumptions?: readonly (
    | string
    | {
        readonly text: string;
        readonly options?: readonly string[];
        readonly confidence?: number;
      }
  )[];
}

/** Por debajo de esta confianza una suposición se marca como dudosa. */
export const UNSURE_CONFIDENCE = 0.6;

/** Cambios que puede hacer el usuario. */
export type IntentEdit =
  | { readonly type: "goal"; readonly text: string }
  | { readonly type: "replace"; readonly id: string; readonly text: string }
  | { readonly type: "remove"; readonly id: string }
  | { readonly type: "restore"; readonly id: string }
  | { readonly type: "add"; readonly kind: IntentItemKind; readonly text: string };

const clean = (text: unknown): string =>
  typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";

/** Normaliza la entrada: descarta fichas vacías o repetidas y da ids estables por posición. */
export function normalizeIntent(input: IntentInput | null | undefined): Intent {
  const goal = clean(input?.goal);
  const items: IntentItem[] = [];
  const seen = new Set<string>();
  const push = (
    kind: IntentItemKind,
    text: string,
    options: readonly string[],
    confidence: number | null,
  ) => {
    const key = `${kind}:${text.toLowerCase()}`;
    if (!text || seen.has(key)) return;
    seen.add(key);
    items.push({
      id: `${kind}-${items.filter((item) => item.kind === kind).length}`,
      kind,
      text,
      originalText: text,
      options,
      confidence,
      removed: false,
      added: false,
    });
  };
  for (const entry of input?.constraints ?? []) {
    push("constraint", clean(typeof entry === "string" ? entry : entry?.text), [], null);
  }
  for (const entry of input?.assumptions ?? []) {
    if (typeof entry === "string") {
      push("assumption", clean(entry), [], null);
      continue;
    }
    const text = clean(entry?.text);
    const options = [
      ...new Set((entry?.options ?? []).map(clean).filter((option) => option && option !== text)),
    ];
    const confidence =
      typeof entry?.confidence === "number" && Number.isFinite(entry.confidence)
        ? Math.min(1, Math.max(0, entry.confidence))
        : null;
    push("assumption", text, options, confidence);
  }
  return { goal, originalGoal: goal, items };
}

/** Aplica un cambio del usuario. Devuelve la misma interpretación si el cambio no aplica. */
export function applyIntentEdit(intent: Intent, edit: IntentEdit): Intent {
  switch (edit.type) {
    case "goal": {
      const text = clean(edit.text);
      return text && text !== intent.goal ? { ...intent, goal: text } : intent;
    }
    case "replace": {
      const text = clean(edit.text);
      if (!text) return intent;
      return updateItem(intent, edit.id, (item) => ({ ...item, text, removed: false }));
    }
    case "remove":
      return updateItem(intent, edit.id, (item) => ({ ...item, removed: true }));
    case "restore":
      return updateItem(intent, edit.id, (item) => ({ ...item, removed: false }));
    case "add": {
      const text = clean(edit.text);
      const duplicate = intent.items.some(
        (item) =>
          item.kind === edit.kind &&
          !item.removed &&
          item.text.toLowerCase() === text.toLowerCase(),
      );
      if (!text || duplicate) return intent;
      const count = intent.items.filter((item) => item.kind === edit.kind).length;
      return {
        ...intent,
        items: [
          ...intent.items,
          {
            id: `${edit.kind}-${count}`,
            kind: edit.kind,
            text,
            originalText: "",
            options: [],
            confidence: null,
            removed: false,
            added: true,
          },
        ],
      };
    }
  }
}

function updateItem(intent: Intent, id: string, change: (item: IntentItem) => IntentItem): Intent {
  let changed = false;
  const items = intent.items.map((item) => {
    if (item.id !== id) return item;
    const next = change(item);
    changed ||= next.text !== item.text || next.removed !== item.removed;
    return next;
  });
  return changed ? { ...intent, items } : intent;
}

/** Una corrección del usuario respecto de lo que entendió el modelo. */
export type IntentChange =
  | { readonly type: "goal"; readonly from: string; readonly to: string }
  | {
      readonly type: "replaced";
      readonly kind: IntentItemKind;
      readonly from: string;
      readonly to: string;
    }
  | { readonly type: "removed"; readonly kind: IntentItemKind; readonly text: string }
  | { readonly type: "added"; readonly kind: IntentItemKind; readonly text: string };

/** Lista las correcciones del usuario, en orden: objetivo, restricciones y suposiciones. */
export function intentChanges(intent: Intent): IntentChange[] {
  const changes: IntentChange[] = [];
  if (intent.goal !== intent.originalGoal) {
    changes.push({ type: "goal", from: intent.originalGoal, to: intent.goal });
  }
  for (const kind of ["constraint", "assumption"] as const) {
    for (const item of intent.items.filter((entry) => entry.kind === kind)) {
      if (item.added) {
        if (!item.removed) changes.push({ type: "added", kind, text: item.text });
      } else if (item.removed) {
        changes.push({ type: "removed", kind, text: item.originalText });
      } else if (item.text !== item.originalText) {
        changes.push({ type: "replaced", kind, from: item.originalText, to: item.text });
      }
    }
  }
  return changes;
}

/** `true` si la suposición merece la atención del usuario (el modelo no estaba seguro). */
export function isUnsure(item: IntentItem): boolean {
  return (
    item.kind === "assumption" && item.confidence !== null && item.confidence < UNSURE_CONFIDENCE
  );
}

/** La interpretación final, en el mismo formato que la entrada (sin las fichas descartadas). */
export function toIntentInput(intent: Intent): Required<Pick<IntentInput, "goal">> & {
  readonly constraints: string[];
  readonly assumptions: string[];
} {
  const active = (kind: IntentItemKind) =>
    intent.items.filter((item) => item.kind === kind && !item.removed).map((item) => item.text);
  return {
    goal: intent.goal,
    constraints: active("constraint"),
    assumptions: active("assumption"),
  };
}
