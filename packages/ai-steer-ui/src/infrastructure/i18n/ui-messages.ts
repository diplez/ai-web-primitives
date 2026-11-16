import type { UiMessages } from "../../application/ports/ui-messages.js";

export const ENGLISH_UI_MESSAGES: UiMessages = {
  answerDial: {
    presets: {
      length: { start: "Shorter", end: "Longer" },
      level: { start: "Simpler", end: "More technical" },
      tone: { start: "Casual", end: "Formal" },
    },
    position: "{label}, {step} of {total}",
    original: "Original",
    rewriting: "Rewriting…",
    reset: "Original",
    failed: "Couldn't rewrite the answer. Try again.",
  },
};

export const SPANISH_UI_MESSAGES: UiMessages = {
  answerDial: {
    presets: {
      length: { start: "Más corto", end: "Más largo" },
      level: { start: "Más simple", end: "Más técnico" },
      tone: { start: "Casual", end: "Formal" },
    },
    position: "{label}, {step} de {total}",
    original: "Original",
    rewriting: "Reescribiendo…",
    reset: "Original",
    failed: "No se pudo reescribir la respuesta. Inténtalo de nuevo.",
  },
};
