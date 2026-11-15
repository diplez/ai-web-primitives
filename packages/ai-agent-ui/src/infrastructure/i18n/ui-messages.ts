import type { UiMessages } from "../../application/ports/ui-messages.js";

export const ENGLISH_UI_MESSAGES: UiMessages = {
  toolCall: {
    status: { pending: "Preparing", running: "Running", success: "Done", error: "Failed" },
    arguments: "Arguments",
    result: "Result",
    error: "Error",
    summary: "{name}, {status}",
  },
  timeline: {
    live: "Live",
    reviewing: "Step {index} of {total}",
    events: "{count} events",
    oneEvent: "1 event",
    empty: "No activity yet",
    replay: "Replay",
    pause: "Pause",
    backToLive: "Back to live",
    fork: "Fork from here",
    scrubber: "Scrub the timeline",
    kinds: {
      message: "Message",
      tool: "Tool",
      decision: "Decision",
      file: "File",
      error: "Error",
      checkpoint: "Checkpoint",
    },
  },
};

export const SPANISH_UI_MESSAGES: UiMessages = {
  toolCall: {
    status: { pending: "Preparando", running: "Ejecutando", success: "Listo", error: "Falló" },
    arguments: "Argumentos",
    result: "Resultado",
    error: "Error",
    summary: "{name}, {status}",
  },
  timeline: {
    live: "En vivo",
    reviewing: "Paso {index} de {total}",
    events: "{count} eventos",
    oneEvent: "1 evento",
    empty: "Sin actividad todavía",
    replay: "Repetir",
    pause: "Pausar",
    backToLive: "Volver a en vivo",
    fork: "Bifurcar desde aquí",
    scrubber: "Recorrer la línea de tiempo",
    kinds: {
      message: "Mensaje",
      tool: "Herramienta",
      decision: "Decisión",
      file: "Archivo",
      error: "Error",
      checkpoint: "Punto de control",
    },
  },
};
