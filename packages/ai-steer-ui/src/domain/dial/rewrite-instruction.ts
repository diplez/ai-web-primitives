import type { Dial, DialValues } from "./dial.js";

/**
 * Arma la instrucción para que el modelo reescriba la respuesta según las perillas. Está en
 * inglés a propósito: es texto para el modelo, no para el usuario.
 *
 * @example
 * "Rewrite your previous answer.
 *  - Make it much shorter.
 *  - Make it a bit more technical, for an expert.
 *  Keep the same facts and meaning. Reply only with the rewritten answer."
 *
 * Con todas las perillas en el centro devuelve `""` (no hay nada que reescribir).
 */
export function buildRewriteInstruction(dials: readonly Dial[], values: DialValues): string {
  const changes = dials.flatMap((dial) => {
    const value = values[dial.id] ?? dial.center;
    const distance = value - dial.center;
    if (distance === 0) return [];
    const hint = distance < 0 ? dial.startHint : dial.endHint;
    const reach = Math.abs(distance) / dial.center; // 0..1
    const amount = reach >= 1 ? "as" : reach > 0.5 ? "much" : "a bit";
    return [amount === "as" ? `- Make it as ${hint} as possible.` : `- Make it ${amount} ${hint}.`];
  });
  if (changes.length === 0) return "";
  return [
    "Rewrite your previous answer.",
    ...changes,
    "Keep the same facts and meaning. Reply only with the rewritten answer.",
  ].join("\n");
}
