import type { UiMessages } from "../../application/ports/ui-messages.js";

export const ENGLISH_UI_MESSAGES: UiMessages = Object.freeze({
  markdown: { copy: "Copy", copied: "Copied" },
  reasoning: {
    empty: "No reasoning yet",
    thinking: "Thinking…",
    thoughtFor: "Thought for {seconds}s",
    finished: "Reasoning complete",
    failed: "Reasoning failed",
    progress: "{completed} of {total} steps",
    statusPending: "Pending",
    statusRunning: "In progress",
    statusDone: "Done",
    statusError: "Failed",
  },
  approval: {
    approve: "Approve",
    deny: "Deny",
    autoDenyIn: "Auto-denies in {seconds}s",
    autoApproveIn: "Auto-approves in {seconds}s",
    paused: "Timer paused",
    approved: "Approved",
    denied: "Denied",
    approvedAutomatically: "Approved automatically",
    deniedAutomatically: "Denied automatically (timed out)",
  },
  citation: { source: "Source", confidence: "{percent}% match", open: "Open source" },
});

export const SPANISH_UI_MESSAGES: UiMessages = Object.freeze({
  markdown: { copy: "Copiar", copied: "Copiado" },
  reasoning: {
    empty: "Sin razonamiento todavía",
    thinking: "Pensando…",
    thoughtFor: "Pensó durante {seconds} s",
    finished: "Razonamiento completo",
    failed: "El razonamiento falló",
    progress: "{completed} de {total} pasos",
    statusPending: "Pendiente",
    statusRunning: "En curso",
    statusDone: "Hecho",
    statusError: "Falló",
  },
  approval: {
    approve: "Aprobar",
    deny: "Denegar",
    autoDenyIn: "Se deniega en {seconds} s",
    autoApproveIn: "Se aprueba en {seconds} s",
    paused: "Temporizador en pausa",
    approved: "Aprobado",
    denied: "Denegado",
    approvedAutomatically: "Aprobado automáticamente",
    deniedAutomatically: "Denegado automáticamente (sin respuesta)",
  },
  citation: { source: "Fuente", confidence: "{percent}% de coincidencia", open: "Abrir fuente" },
});
