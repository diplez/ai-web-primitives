// © 2026 Diego Lopez (diplez). All rights reserved.
import { intentChanges, toIntentInput, type Intent, type IntentItemKind } from "./intent.js";

/**
 * Instrucción para que el modelo describa lo que entendió antes de actuar, en el formato que
 * acepta `<dz-intent-lens>`. Está en inglés a propósito: es texto para el modelo.
 */
export const INTENT_REQUEST_PROMPT = [
  "Before doing the task, describe how you understood it. Reply only with JSON in this shape:",
  "{",
  '  "goal": "what the user wants, in one short sentence",',
  '  "constraints": ["rules the user stated explicitly"],',
  '  "assumptions": [',
  '    { "text": "a choice you made on your own", "options": ["other reasonable choices"], "confidence": 0.0 }',
  "  ]",
  "}",
  "List as assumptions every decision the user did not state (technology, format, audience, scope…).",
  "confidence goes from 0 to 1: use a low value when you are guessing.",
  "Keep every item short (2 to 6 words).",
].join("\n");

const KIND_LABEL: Readonly<Record<IntentItemKind, string>> = {
  constraint: "constraint",
  assumption: "assumption",
};

/**
 * Arma la instrucción para que el modelo siga con la interpretación corregida por el usuario.
 * Sin cambios, solo confirma que entendió bien.
 */
export function buildIntentInstruction(intent: Intent): string {
  const changes = intentChanges(intent);
  const final = toIntentInput(intent);
  const lines: string[] = [];
  if (changes.length === 0) {
    lines.push("The user confirmed your interpretation. Go ahead with the task.");
  } else {
    lines.push("The user reviewed your interpretation and made these corrections:");
    for (const change of changes) {
      switch (change.type) {
        case "goal":
          lines.push(`- The goal is "${change.to}" (not "${change.from}").`);
          break;
        case "replaced":
          lines.push(`- Use "${change.to}" instead of "${change.from}".`);
          break;
        case "removed":
          lines.push(`- Drop the ${KIND_LABEL[change.kind]} "${change.text}".`);
          break;
        case "added":
          lines.push(`- New ${KIND_LABEL[change.kind]}: "${change.text}".`);
          break;
      }
    }
    lines.push("Follow these corrections and go ahead with the task.");
  }
  lines.push("", "Final interpretation:", JSON.stringify(final, null, 2));
  return lines.join("\n");
}

/**
 * Interpreta la respuesta del modelo a `INTENT_REQUEST_PROMPT`. Tolera texto alrededor del
 * JSON y bloques de código. Devuelve `null` si no encuentra un objeto válido.
 */
export function parseIntentResponse(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value: unknown = JSON.parse(text.slice(start, end + 1));
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
