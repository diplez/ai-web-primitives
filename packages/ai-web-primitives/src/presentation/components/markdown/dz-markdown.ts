import { LitElement, html, nothing, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import type { AbortSignalLike } from "../../../application/ports/abort-signal-like.js";
import type { ClipboardWriter } from "../../../application/ports/clipboard-writer.js";
import type { Clock } from "../../../application/ports/clock.js";
import type { UiMessages } from "../../../application/ports/ui-messages.js";
import type {
  StreamMarkdown,
  StreamMarkdownResult,
} from "../../../application/use-cases/markdown/stream-markdown.js";
import type {
  MarkdownBlock,
  MarkdownInline,
  MarkdownList,
} from "../../../domain/markdown/markdown-ast.js";
import { parseMarkdown } from "../../../domain/markdown/parse-markdown.js";
import { dedent } from "../../../domain/shared/dedent.js";
import type { StreamFormat } from "../../../domain/stream/stream-event.js";
import { themeTokens } from "../../theme/theme-tokens.js";
import { markdownStyles } from "./dz-markdown.styles.js";

export interface MarkdownDependencies {
  readonly streamMarkdown: Pick<StreamMarkdown, "execute">;
  readonly clipboard: ClipboardWriter;
  readonly clock: Pick<Clock, "every">;
  readonly messages: UiMessages["markdown"];
}

export interface MarkdownStreamOptions {
  /** Formato del stream. Por defecto `auto` (OpenAI, Anthropic, AI SDK o texto plano). */
  readonly format?: StreamFormat;
  /** Para cancelar el stream (p. ej. un botón "Detener"). */
  readonly signal?: AbortSignalLike;
  /** Agregar al contenido actual en lugar de reemplazarlo. */
  readonly append?: boolean;
  /** Recibe el razonamiento ("thinking") del modelo, si el proveedor lo envía. */
  readonly onReasoning?: (delta: string) => void;
}

const COPIED_FEEDBACK_MS = 1600;

/**
 * Renderiza markdown, también mientras llega en streaming desde un modelo de lenguaje.
 *
 * - **Seguro por construcción**: el markdown se convierte en un árbol y se pinta con
 *   plantillas; nunca se usa `innerHTML`. Los enlaces `javascript:`/`data:` se descartan y
 *   las imágenes se muestran como enlaces (no se cargan recursos de terceros).
 * - **Tolerante al streaming**: negritas, código y enlaces sin cerrar se ven bien mientras
 *   llegan; las tablas aparecen recién cuando su estructura es inequívoca.
 * - **Conectado a los proveedores**: `await el.stream(await fetch(...))` entiende OpenAI,
 *   Anthropic, Vercel AI SDK y texto plano.
 *
 * El contenido puede venir de la propiedad/atributo `content` o del texto escrito dentro
 * de la etiqueta.
 *
 * @tag dz-markdown
 * @fires dz-stream-start - Empezó un stream.
 * @fires dz-stream-end - Terminó un stream. `detail: { text, aborted }`.
 * @fires dz-stream-error - Falló un stream. `detail: { error }`.
 * @fires dz-reasoning - Llegó un delta de razonamiento. `detail: { delta }`.
 * @fires dz-copy - Se copió un bloque de código. `detail: { text, language }`.
 * @csspart code-block - Contenedor de un bloque de código.
 * @csspart code - El `<pre>` del bloque de código.
 * @csspart copy-button - Botón de copiar del bloque de código.
 * @csspart table - Contenedor (con scroll) de una tabla.
 * @csspart blockquote - Cita.
 * @csspart link - Enlace.
 * @cssprop --dz-accent - Color de enlaces y del cursor de streaming.
 * @cssprop --dz-code-bg - Fondo de los bloques de código.
 * @cssprop --dz-font-mono - Fuente monoespaciada.
 */
export class DzMarkdown extends LitElement {
  static dependencies?: MarkdownDependencies;

  static override styles = [themeTokens, markdownStyles];

  /** Texto markdown a mostrar. */
  @property() content = "";

  /** Indica que el texto sigue llegando: activa la tolerancia a contenido cortado y el cursor. */
  @property({ type: Boolean, reflect: true }) streaming = false;

  @state() private copiedBlock: number | null = null;

  private cachedSource: string | null = null;
  private cachedStreaming = false;
  private cachedBlocks: MarkdownBlock[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    // Contenido escrito dentro de la etiqueta: <dz-markdown># Hola</dz-markdown>
    if (!this.content && this.textContent?.trim()) {
      this.content = dedent(this.textContent);
    }
  }

  /** Agrega texto al final (útil si el consumidor maneja el stream por su cuenta). */
  appendText(delta: string): void {
    this.content += delta;
  }

  /** Vacía el contenido. */
  clear(): void {
    this.content = "";
  }

  /**
   * Consume un stream y lo va mostrando. Acepta la `Response` de `fetch`, un
   * `ReadableStream` o un `AsyncIterable` de texto. Resuelve con el texto final.
   */
  async stream(
    source: unknown,
    options: MarkdownStreamOptions = {},
  ): Promise<StreamMarkdownResult> {
    const { streamMarkdown } = this.getDependencies();
    this.streaming = true;
    this.emit("dz-stream-start", {});
    try {
      const result = await streamMarkdown.execute({
        source,
        format: options.format,
        signal: options.signal,
        initialText: options.append ? this.content : "",
        onText: (text) => {
          this.content = text;
        },
        onReasoning: (delta) => {
          options.onReasoning?.(delta);
          this.emit("dz-reasoning", { delta });
        },
      });
      this.emit("dz-stream-end", result);
      return result;
    } catch (error) {
      this.emit("dz-stream-error", { error });
      throw error;
    } finally {
      this.streaming = false;
    }
  }

  protected override render() {
    const blocks = this.blocks();
    const lastIndex = blocks.length - 1;
    return html`<div class="document">
      ${blocks.map((block, index) => this.renderBlock(block, index, this.streaming && index === lastIndex))}
      ${this.streaming && blocks.length === 0 ? this.caret() : nothing}
    </div>`;
  }

  private blocks(): MarkdownBlock[] {
    if (this.cachedSource !== this.content || this.cachedStreaming !== this.streaming) {
      this.cachedSource = this.content;
      this.cachedStreaming = this.streaming;
      this.cachedBlocks = parseMarkdown(this.content, { streaming: this.streaming });
    }
    return this.cachedBlocks;
  }

  private caret(): TemplateResult {
    return html`<span class="caret" aria-hidden="true"></span>`;
  }

  private renderBlock(block: MarkdownBlock, index: number, withCaret: boolean): TemplateResult {
    const caret = withCaret ? this.caret() : nothing;
    switch (block.type) {
      case "heading": {
        const content = html`${this.renderInlines(block.children)}${caret}`;
        switch (block.level) {
          case 1:
            return html`<h1>${content}</h1>`;
          case 2:
            return html`<h2>${content}</h2>`;
          case 3:
            return html`<h3>${content}</h3>`;
          case 4:
            return html`<h4>${content}</h4>`;
          case 5:
            return html`<h5>${content}</h5>`;
          default:
            return html`<h6>${content}</h6>`;
        }
      }
      case "paragraph":
        return html`<p>${this.renderInlines(block.children)}${caret}</p>`;
      case "code":
        return this.renderCode(block.value, block.language, index, withCaret);
      case "list":
        return this.renderList(block, withCaret);
      case "blockquote":
        return html`<blockquote part="blockquote">
          ${block.children.map((child, childIndex) =>
            this.renderBlock(child, -1, withCaret && childIndex === block.children.length - 1),
          )}
        </blockquote>`;
      case "table":
        return html`<div class="table-wrap" part="table" tabindex="0">
            <table>
              <thead>
                <tr>
                  ${block.header.map(
                    (cell, column) =>
                      html`<th style="text-align: ${block.align[column] ?? "left"}">
                        ${this.renderInlines(cell)}
                      </th>`,
                  )}
                </tr>
              </thead>
              <tbody>
                ${block.rows.map(
                  (row) =>
                    html`<tr>
                      ${row.map(
                        (cell, column) =>
                          html`<td style="text-align: ${block.align[column] ?? "left"}">
                            ${this.renderInlines(cell)}
                          </td>`,
                      )}
                    </tr>`,
                )}
              </tbody>
            </table>
          </div>
          ${caret}`;
      case "rule":
        return html`<hr />
          ${caret}`;
    }
  }

  private renderCode(value: string, language: string, index: number, withCaret: boolean) {
    const { messages } = this.getDependencies();
    const copied = this.copiedBlock === index;
    return html`<div class="code-block" part="code-block">
      <div class="code-header">
        <span class="language">${language || "text"}</span>
        <button
          type="button"
          class="copy"
          part="copy-button"
          data-state=${copied ? "copied" : "idle"}
          @click=${() => this.copy(value, language, index)}
        >
          ${copied ? messages.copied : messages.copy}
        </button>
      </div>
      <pre part="code"><code>${value}${withCaret ? this.caret() : nothing}</code></pre>
    </div>`;
  }

  private renderList(list: MarkdownList, withCaret: boolean): TemplateResult {
    const lastItem = list.items.length - 1;
    const items = list.items.map((item, index) => {
      const isLast = withCaret && index === lastItem;
      return html`<li class=${item.checked === null ? "" : "task"}>
        ${
          item.checked === null
            ? nothing
            : html`<input type="checkbox" disabled .checked=${item.checked} />`
        }
        ${this.renderInlines(item.children)}${isLast && !item.sublist ? this.caret() : nothing}
        ${item.sublist ? this.renderList(item.sublist, isLast) : nothing}
      </li>`;
    });
    return list.ordered
      ? html`<ol start=${list.start}>
          ${items}
        </ol>`
      : html`<ul>
          ${items}
        </ul>`;
  }

  private renderInlines(nodes: readonly MarkdownInline[]): unknown[] {
    return nodes.map((node) => this.renderInline(node));
  }

  private renderInline(node: MarkdownInline): unknown {
    switch (node.type) {
      case "text":
        return node.value;
      case "strong":
        return html`<strong>${this.renderInlines(node.children)}</strong>`;
      case "emphasis":
        return html`<em>${this.renderInlines(node.children)}</em>`;
      case "strike":
        return html`<del>${this.renderInlines(node.children)}</del>`;
      case "code":
        return html`<code class="inline-code">${node.value}</code>`;
      case "break":
        return html`<br />`;
      case "link":
        return node.href
          ? html`<a part="link" href=${node.href} target="_blank" rel="noopener noreferrer"
              >${this.renderInlines(node.children)}</a
            >`
          : html`<span class="pending-link">${this.renderInlines(node.children)}</span>`;
    }
  }

  private async copy(text: string, language: string, index: number): Promise<void> {
    const { clipboard, clock } = this.getDependencies();
    try {
      await clipboard.write(text);
    } catch {
      return;
    }
    this.copiedBlock = index;
    this.emit("dz-copy", { text, language });
    const cancel = clock.every(COPIED_FEEDBACK_MS, () => {
      cancel();
      if (this.copiedBlock === index) this.copiedBlock = null;
    });
  }

  private emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private getDependencies(): MarkdownDependencies {
    const { dependencies } = this.constructor as typeof DzMarkdown;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineMarkdown().`,
      );
    }
    return dependencies;
  }
}
