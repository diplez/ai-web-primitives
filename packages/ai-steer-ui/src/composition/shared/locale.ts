import type { UiMessages } from "../../application/ports/ui-messages.js";
import { ENGLISH_UI_MESSAGES, SPANISH_UI_MESSAGES } from "../../infrastructure/i18n/ui-messages.js";

/** Idiomas incluidos. Para otros, pasar `messages` propios en cada `define*()`. */
export type Locale = "en" | "es";

const UI_MESSAGES: Readonly<Record<Locale, UiMessages>> = {
  en: ENGLISH_UI_MESSAGES,
  es: SPANISH_UI_MESSAGES,
};

/** Textos de un componente en el idioma pedido, con las sobrescrituras del consumidor. */
export function resolveMessages<K extends keyof UiMessages>(
  section: K,
  locale: Locale | undefined,
  overrides: Partial<UiMessages[K]> | undefined,
): UiMessages[K] {
  return Object.freeze({ ...UI_MESSAGES[locale ?? "en"][section], ...overrides }) as UiMessages[K];
}
