import { svg, type SVGTemplateResult } from "lit";
import type { AgentEventKind } from "../../../domain/timeline/agent-event.js";

/** Íconos de 16×16 por tipo de evento. Usan `currentColor`. */
export const EVENT_ICONS: Readonly<Record<AgentEventKind, SVGTemplateResult>> = {
  message: svg`<path d="M3 3.5h10a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1H7.5L4.5 13.5v-2.5H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />`,
  tool: svg`<path d="M10.5 2.5a3 3 0 0 0-2.8 4.1L2.8 11.5a1.2 1.2 0 0 0 1.7 1.7l4.9-4.9a3 3 0 0 0 4.1-2.8l-1.8 1.1-1.6-.6-.4-1.7Z" />`,
  decision: svg`<path d="M8 1.8 14.2 8 8 14.2 1.8 8Z" /><path d="M8 5.2v3.6M8 10.6v.2" />`,
  file: svg`<path d="M4 1.8h5l3 3v9.4H4Z" /><path d="M9 1.8v3h3M6 8.5h4M6 11h4" />`,
  error: svg`<circle cx="8" cy="8" r="6.2" /><path d="M8 4.6v4.2M8 10.9v.2" />`,
  checkpoint: svg`<path d="M4 14.2V2" /><path d="M4 2.5h8l-1.8 2.8L12 8H4" />`,
};
