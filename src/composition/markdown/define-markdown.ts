import type { UiMessages } from "../../application/ports/ui-messages.js";
import { StreamMarkdown } from "../../application/use-cases/markdown/stream-markdown.js";
import { AnimationFrameScheduler } from "../../infrastructure/browser/animation-frame-scheduler.js";
import { NavigatorClipboard } from "../../infrastructure/browser/navigator-clipboard.js";
import { SystemClock } from "../../infrastructure/browser/system-clock.js";
import { FetchStreamEventSource } from "../../infrastructure/stream/fetch-stream-event-source.js";
import {
  DzMarkdown,
  type MarkdownDependencies,
} from "../../presentation/components/markdown/dz-markdown.js";
import { resolveMessages, type Locale } from "../shared/locale.js";

export const MARKDOWN_TAG = "dz-markdown";

export interface DefineMarkdownOptions {
  /** Nombre de etiqueta alternativo. Por defecto `dz-markdown`. */
  readonly tagName?: string;
  /** Idioma de los textos de interfaz ("Copiar", …). Por defecto `en`. */
  readonly locale?: Locale;
  /** Textos propios (sobrescriben los del idioma). */
  readonly messages?: Partial<UiMessages["markdown"]>;
  readonly registry?: CustomElementRegistry;
}

/** Registra `<dz-markdown>`. Idempotente. */
export function defineMarkdown(options: DefineMarkdownOptions = {}): typeof DzMarkdown {
  const tagName = options.tagName ?? MARKDOWN_TAG;
  const registry = options.registry ?? customElements;
  const existing = registry.get(tagName);
  if (existing) return existing as typeof DzMarkdown;

  const dependencies: MarkdownDependencies = {
    streamMarkdown: new StreamMarkdown(new FetchStreamEventSource(), new AnimationFrameScheduler()),
    clipboard: new NavigatorClipboard(),
    clock: new SystemClock(),
    messages: resolveMessages("markdown", options.locale, options.messages),
  };

  class RegisteredMarkdown extends DzMarkdown {
    static override dependencies = dependencies;
  }
  registry.define(tagName, RegisteredMarkdown);
  return RegisteredMarkdown;
}

declare global {
  interface HTMLElementTagNameMap {
    "dz-markdown": DzMarkdown;
  }
}
