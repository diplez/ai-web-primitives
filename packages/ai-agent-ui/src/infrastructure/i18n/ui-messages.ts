import type { UiMessages } from "../../application/ports/ui-messages.js";

export const ENGLISH_UI_MESSAGES: UiMessages = {
  toolCall: {
    status: { pending: "Preparing", running: "Running", success: "Done", error: "Failed" },
    arguments: "Input",
    result: "Output",
    error: "Error",
    summary: "{name}, {status}",
  },
  timeline: {
    live: "Live",
    reviewing: "Step {index} of {total}",
    events: "{count} events",
    oneEvent: "1 event",
    empty: "No activity yet",
    replay: "Play",
    pause: "Pause",
    backToLive: "Jump to latest",
    fork: "Retry from here",
    scrubber: "Move through the history",
    kinds: {
      message: "Message",
      tool: "Tool",
      decision: "Decision",
      file: "File",
      error: "Error",
      checkpoint: "Milestone",
    },
  },
};

export const SPANISH_UI_MESSAGES: UiMessages = {
  toolCall: {
    status: { pending: "Preparando", running: "Ejecutando", success: "Listo", error: "Falló" },
    arguments: "Entrada",
    result: "Salida",
    error: "Error",
    summary: "{name}, {status}",
  },
  timeline: {
    live: "En vivo",
    reviewing: "Paso {index} de {total}",
    events: "{count} eventos",
    oneEvent: "1 evento",
    empty: "Sin actividad todavía",
    replay: "Reproducir",
    pause: "Pausar",
    backToLive: "Ir al final",
    fork: "Reintentar desde aquí",
    scrubber: "Recorrer el historial",
    kinds: {
      message: "Mensaje",
      tool: "Herramienta",
      decision: "Decisión",
      file: "Archivo",
      error: "Error",
      checkpoint: "Hito",
    },
  },
};
