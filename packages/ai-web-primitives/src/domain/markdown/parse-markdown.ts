import type {
  MarkdownBlock,
  MarkdownList,
  MarkdownListItem,
  MarkdownTableAlign,
} from "./markdown-ast.js";
import { parseInline } from "./parse-inline.js";

export interface ParseMarkdownOptions {
  /**
   * El texto todavía está llegando (streaming). Activa la tolerancia a contenido cortado:
   * bloques de código sin cerrar, formato sin cierre, tablas a medio llegar, etc.
   */
  readonly streaming?: boolean;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}> ?(.*)$/;
const LIST_ITEM = /^( *)([-+*]|\d{1,9}[.)])(?:[ \t]+(.*))?$/;
const TABLE_DELIMITER = /^ *\|? *:?-+:? *(\| *:?-+:? *)*\|? *$/;
const PARTIAL_TABLE_DELIMITER = /^ *\|?[ :|-]*$/;

const isBlank = (line: string): boolean => line.trim() === "";

/** Divide una fila de tabla en celdas, respetando `\|` escapados. */
function splitRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < row.length; index++) {
    const char = row[index];
    if (char === "\\" && row[index + 1] === "|") {
      current += "|";
      index++;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

const isTableStart = (line: string | undefined, next: string | undefined): boolean =>
  line !== undefined &&
  next !== undefined &&
  line.includes("|") &&
  TABLE_DELIMITER.test(next) &&
  next.includes("-") &&
  splitRow(line).length === splitRow(next).length;

const startsBlock = (line: string, next: string | undefined): boolean =>
  FENCE.test(line) ||
  HEADING.test(line) ||
  RULE.test(line) ||
  QUOTE.test(line) ||
  LIST_ITEM.test(line) ||
  isTableStart(line, next);

class BlockParser {
  private index = 0;

  constructor(
    private readonly lines: readonly string[],
    private readonly streaming: boolean,
  ) {}

  parse(): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    while (this.index < this.lines.length) {
      const block = this.next();
      if (block === "stop") break;
      if (block) blocks.push(block);
    }
    return blocks;
  }

  private get isLastLine(): boolean {
    return this.index === this.lines.length - 1;
  }

  private next(): MarkdownBlock | null | "stop" {
    const line = this.lines[this.index]!;
    const following = this.lines[this.index + 1];

    if (isBlank(line)) {
      this.index++;
      return null;
    }

    const fence = FENCE.exec(line);
    if (fence) return this.code(fence[1]!, fence[2] ?? "");

    const heading = HEADING.exec(line);
    if (heading) {
      this.index++;
      const level = heading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6;
      return { type: "heading", level, children: parseInline(heading[2] ?? "", this.streaming) };
    }

    if (RULE.test(line)) {
      this.index++;
      return { type: "rule" };
    }

    if (QUOTE.test(line)) return this.blockquote();

    if (isTableStart(line, following)) return this.table();

    // Una tabla que aún no recibió su fila de separación: no se muestra hasta saber qué es.
    if (
      this.streaming &&
      line.trimStart().startsWith("|") &&
      (following === undefined ||
        (this.index + 1 === this.lines.length - 1 && PARTIAL_TABLE_DELIMITER.test(following)))
    ) {
      return "stop";
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      // Un marcador solo al final del stream ("-" o "1.") puede terminar siendo otra cosa ("---").
      if (this.streaming && this.isLastLine && !item[3]) return "stop";
      return this.list(item[1]!.length);
    }

    return this.paragraph();
  }

  private code(marker: string, language: string): MarkdownBlock {
    const char = marker[0]!;
    const body: string[] = [];
    this.index++;
    while (this.index < this.lines.length) {
      const line = this.lines[this.index]!;
      const closing = new RegExp(`^ {0,3}\\${char}{${marker.length},}[ \\t]*$`);
      if (closing.test(line)) {
        this.index++;
        return { type: "code", language, value: body.join("\n"), complete: true };
      }
      body.push(line);
      this.index++;
    }
    return { type: "code", language, value: body.join("\n"), complete: false };
  }

  private blockquote(): MarkdownBlock {
    const inner: string[] = [];
    while (this.index < this.lines.length) {
      const line = this.lines[this.index]!;
      const quote = QUOTE.exec(line);
      if (quote) inner.push(quote[1]!);
      else if (!isBlank(line) && inner.length > 0 && !isBlank(inner[inner.length - 1]!)) {
        if (startsBlock(line, this.lines[this.index + 1])) break;
        inner.push(line); // continuación perezosa del párrafo citado
      } else break;
      this.index++;
    }
    return { type: "blockquote", children: new BlockParser(inner, this.streaming).parse() };
  }

  private table(): MarkdownBlock {
    const header = splitRow(this.lines[this.index]!);
    const align = splitRow(this.lines[this.index + 1]!).map((cell): MarkdownTableAlign => {
      const left = cell.startsWith(":");
      const right = cell.endsWith(":");
      if (left && right) return "center";
      if (right) return "right";
      if (left) return "left";
      return null;
    });
    this.index += 2;

    const rows: string[][] = [];
    while (this.index < this.lines.length) {
      const line = this.lines[this.index]!;
      if (isBlank(line) || !line.includes("|")) break;
      rows.push(splitRow(line));
      this.index++;
    }

    const toCells = (cells: readonly string[]) =>
      header.map((cell, column) => parseInline(cells[column] ?? "", this.streaming));

    return {
      type: "table",
      align,
      header: toCells(header),
      rows: rows.map(toCells),
    };
  }

  private list(baseIndent: number): MarkdownList {
    const first = LIST_ITEM.exec(this.lines[this.index]!)!;
    const ordered = /\d/.test(first[2]!);
    const start = ordered ? Number.parseInt(first[2]!, 10) : 1;
    const items: MarkdownListItem[] = [];

    while (this.index < this.lines.length) {
      const line = this.lines[this.index]!;
      const item = LIST_ITEM.exec(line);

      if (!item) {
        // Línea en blanco entre ítems: la lista sigue si el próximo contenido es otro ítem.
        if (isBlank(line)) {
          let lookahead = this.index + 1;
          while (lookahead < this.lines.length && isBlank(this.lines[lookahead]!)) lookahead++;
          const nextItem = LIST_ITEM.exec(this.lines[lookahead] ?? "");
          if (nextItem && nextItem[1]!.length >= baseIndent) {
            this.index = lookahead;
            continue;
          }
        }
        break;
      }

      const indent = item[1]!.length;
      if (indent < baseIndent) break;
      if (indent > baseIndent) {
        // Sublista del último ítem
        const last = items.pop();
        if (!last) break;
        items.push({ ...last, sublist: this.list(indent) });
        continue;
      }
      if (/\d/.test(item[2]!) !== ordered) break;

      this.index++;
      // Continuaciones del ítem: líneas indentadas o texto perezoso.
      let content = item[3] ?? "";
      while (this.index < this.lines.length) {
        const next = this.lines[this.index]!;
        if (isBlank(next) || LIST_ITEM.test(next)) break;
        if (startsBlock(next, this.lines[this.index + 1]) && !/^\s+/.test(next)) break;
        content += `\n${next.trim()}`;
        this.index++;
      }

      const task = /^\[([ xX])\][ \t]+/.exec(content);
      items.push({
        children: parseInline(task ? content.slice(task[0].length) : content, this.streaming),
        checked: task ? task[1] !== " " : null,
        sublist: null,
      });
    }

    return { type: "list", ordered, start, items };
  }

  private paragraph(): MarkdownBlock {
    const lines: string[] = [];
    while (this.index < this.lines.length) {
      const line = this.lines[this.index]!;
      if (isBlank(line)) break;
      if (lines.length > 0 && startsBlock(line, this.lines[this.index + 1])) break;
      lines.push(line.replace(/^ {0,3}/, ""));
      this.index++;
    }
    return { type: "paragraph", children: parseInline(lines.join("\n"), this.streaming) };
  }
}

/**
 * Convierte markdown (CommonMark + tablas, tachado, listas de tareas y URLs sueltas de GFM)
 * en un árbol de bloques. No produce HTML y no ejecuta nada: es seguro con texto no confiable.
 */
export function parseMarkdown(source: string, options: ParseMarkdownOptions = {}): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  return new BlockParser(lines, options.streaming ?? false).parse();
}
