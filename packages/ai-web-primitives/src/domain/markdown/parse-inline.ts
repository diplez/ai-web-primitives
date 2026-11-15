import { sanitizeHref } from "../shared/safe-url.js";
import type { MarkdownInline } from "./markdown-ast.js";

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!|~<>"']/;
const BARE_URL = /^https?:\/\/[^\s<]+/;

interface Delimiter {
  readonly marker: string;
  readonly type: "strong" | "emphasis" | "strike";
}

const DELIMITERS: readonly Delimiter[] = [
  { marker: "**", type: "strong" },
  { marker: "__", type: "strong" },
  { marker: "~~", type: "strike" },
  { marker: "*", type: "emphasis" },
  { marker: "_", type: "emphasis" },
];

const isWhitespace = (char: string | undefined): boolean => char === undefined || /\s/.test(char);
const isWordChar = (char: string | undefined): boolean =>
  char !== undefined && /[\p{L}\p{N}]/u.test(char);

const runLength = (text: string, index: number, char: string): number => {
  let length = 0;
  while (text[index + length] === char) length++;
  return length;
};

/** Salta un code span que empieza en `index`; devuelve el índice posterior, o `index + 1`. */
function skipCodeSpan(text: string, index: number): number {
  const ticks = runLength(text, index, "`");
  const close = findBacktickRun(text, index + ticks, ticks);
  return close === -1 ? index + ticks : close + ticks;
}

function findBacktickRun(text: string, from: number, length: number): number {
  let index = text.indexOf("`", from);
  while (index !== -1) {
    const run = runLength(text, index, "`");
    if (run === length) return index;
    index = text.indexOf("`", index + run);
  }
  return -1;
}

/** Busca el cierre de un delimitador de énfasis, ignorando code spans y escapes. */
function findCloser(text: string, from: number, delimiter: Delimiter): number {
  const char = delimiter.marker[0]!;
  let index = from;
  while (index < text.length) {
    const current = text[index];
    if (current === "\\") {
      index += 2;
      continue;
    }
    if (current === "`") {
      index = skipCodeSpan(text, index);
      continue;
    }
    if (current === char) {
      const run = runLength(text, index, char);
      const fits = delimiter.marker.length === 1 ? run === 1 : run >= 2;
      const flanked = !isWhitespace(text[index - 1]);
      const intraword = char === "_" && isWordChar(text[index + run]);
      if (fits && flanked && !intraword) return index;
      index += run;
      continue;
    }
    index++;
  }
  return -1;
}

/** Busca el `]` que cierra un `[` en `from - 1`, respetando corchetes anidados. */
function findLabelEnd(text: string, from: number): number {
  let depth = 1;
  for (let index = from; index < text.length; index++) {
    const char = text[index];
    if (char === "\\") index++;
    else if (char === "[") depth++;
    else if (char === "]" && --depth === 0) return index;
  }
  return -1;
}

/** Busca el `)` que cierra el destino de un enlace, respetando paréntesis anidados. */
function findDestinationEnd(text: string, from: number): number {
  let depth = 1;
  for (let index = from; index < text.length; index++) {
    const char = text[index];
    if (char === "\\") index++;
    else if (char === "(") depth++;
    else if (char === ")" && --depth === 0) return index;
  }
  return -1;
}

/** Extrae la URL de un destino `url "título"` o `<url>`. */
function destinationUrl(destination: string): string {
  const trimmed = destination.trim();
  if (trimmed.startsWith("<")) {
    const end = trimmed.indexOf(">");
    return trimmed.slice(1, end === -1 ? undefined : end);
  }
  return trimmed.split(/\s+/)[0] ?? "";
}

const count = (text: string, char: string): number => text.split(char).length - 1;

/**
 * Recorta puntuación final que casi nunca forma parte de una URL suelta en un texto,
 * y paréntesis de cierre sin pareja: "(ver https://x.com/a)" → "https://x.com/a".
 */
function trimBareUrl(url: string): string {
  let result = url.replace(/[.,;:!?'"]+$/, "");
  while (result.endsWith(")") && count(result, ")") > count(result, "(")) {
    result = result.slice(0, -1).replace(/[.,;:!?'"]+$/, "");
  }
  return result;
}

class InlineBuilder {
  readonly nodes: MarkdownInline[] = [];
  private buffer = "";

  text(value: string): void {
    this.buffer += value;
  }

  node(node: MarkdownInline): void {
    this.flush();
    this.nodes.push(node);
  }

  done(): MarkdownInline[] {
    this.flush();
    return this.nodes;
  }

  private flush(): void {
    if (this.buffer) {
      this.nodes.push({ type: "text", value: this.buffer });
      this.buffer = "";
    }
  }
}

/**
 * Convierte el texto de un bloque en nodos inline.
 *
 * Con `streaming = true` el texto puede estar cortado a la mitad: los delimitadores sin
 * cierre (`**negr`, `` `cod ``) se cierran al final para que el formato aparezca de inmediato,
 * y los enlaces incompletos muestran solo su texto (la URL a medio llegar nunca se usa).
 */
export function parseInline(text: string, streaming = false): MarkdownInline[] {
  const out = new InlineBuilder();
  let index = 0;

  while (index < text.length) {
    const char = text[index]!;
    const rest = text.slice(index);

    // Escapes
    if (char === "\\") {
      const next = text[index + 1];
      if (next === "\n") {
        out.node({ type: "break" });
        index += 2;
        continue;
      }
      if (next !== undefined && ESCAPABLE.test(next)) {
        out.text(next);
        index += 2;
        continue;
      }
    }

    // Saltos de línea duros: dos espacios o más antes del salto
    if (char === "\n") {
      const trailing = /( {2,})$/.exec(text.slice(0, index));
      if (trailing) out.node({ type: "break" });
      else out.text("\n");
      index++;
      continue;
    }

    // Code spans
    if (char === "`") {
      const ticks = runLength(text, index, "`");
      const close = findBacktickRun(text, index + ticks, ticks);
      if (close !== -1) {
        const raw = text.slice(index + ticks, close).replace(/\n/g, " ");
        const value = /^ .* $/.test(raw) && raw.trim() !== "" ? raw.slice(1, -1) : raw;
        out.node({ type: "code", value });
        index = close + ticks;
        continue;
      }
      if (streaming) {
        out.node({ type: "code", value: text.slice(index + ticks) });
        break;
      }
      out.text(text.slice(index, index + ticks));
      index += ticks;
      continue;
    }

    // Enlaces e imágenes (las imágenes se muestran como enlace: nunca se cargan recursos externos)
    if (char === "[" || (char === "!" && text[index + 1] === "[")) {
      const labelStart = index + (char === "!" ? 2 : 1);
      const labelEnd = findLabelEnd(text, labelStart);
      if (labelEnd === -1) {
        if (streaming) {
          out.node({
            type: "link",
            href: null,
            children: parseInline(text.slice(labelStart), true),
          });
          break;
        }
      } else if (text[labelEnd + 1] === "(") {
        const destinationEnd = findDestinationEnd(text, labelEnd + 2);
        const label = parseInline(text.slice(labelStart, labelEnd), streaming);
        if (destinationEnd !== -1) {
          const url = destinationUrl(text.slice(labelEnd + 2, destinationEnd));
          out.node({ type: "link", href: sanitizeHref(url), children: label });
          index = destinationEnd + 1;
          continue;
        }
        if (streaming) {
          out.node({ type: "link", href: null, children: label });
          break;
        }
      } else if (streaming && labelEnd === text.length - 1) {
        // "[texto]" al final: puede que aún falte "(url)".
        out.node({
          type: "link",
          href: null,
          children: parseInline(text.slice(labelStart, labelEnd), true),
        });
        break;
      }
      out.text(char === "!" ? "![" : "[");
      index = labelStart;
      continue;
    }

    // Autolinks <https://…>
    if (char === "<") {
      const autolink = /^<(https?:\/\/[^\s>]+|mailto:[^\s>]+)>/i.exec(rest);
      if (autolink) {
        const url = autolink[1]!;
        out.node({
          type: "link",
          href: sanitizeHref(url),
          children: [{ type: "text", value: url.replace(/^mailto:/i, "") }],
        });
        index += autolink[0].length;
        continue;
      }
    }

    // URLs sueltas (estilo GFM)
    if ((char === "h" || char === "H") && !isWordChar(text[index - 1])) {
      const bare = BARE_URL.exec(rest);
      if (bare) {
        const url = trimBareUrl(bare[0]);
        out.node({
          type: "link",
          href: sanitizeHref(url),
          children: [{ type: "text", value: url }],
        });
        index += url.length;
        continue;
      }
    }

    // Énfasis, negrita y tachado
    const delimiter = DELIMITERS.find((candidate) => rest.startsWith(candidate.marker));
    if (delimiter) {
      const run = runLength(text, index, char);
      const opensWord = !isWhitespace(text[index + run]);
      const intraword = char === "_" && isWordChar(text[index - 1]);
      const usable = delimiter.marker.length === 2 ? run >= 2 : run === 1;

      if (opensWord && !intraword && usable) {
        const contentStart = index + delimiter.marker.length;
        const close = findCloser(text, contentStart, delimiter);
        if (close !== -1 && close > contentStart) {
          out.node({
            type: delimiter.type,
            children: parseInline(text.slice(contentStart, close), streaming),
          });
          index = close + delimiter.marker.length;
          continue;
        }
        if (close === -1 && streaming && contentStart < text.length) {
          out.node({ type: delimiter.type, children: parseInline(text.slice(contentStart), true) });
          break;
        }
      }
      // Un delimitador suelto al final del stream todavía puede convertirse en formato: se oculta.
      if (streaming && index + run === text.length) break;
      out.text(text.slice(index, index + run));
      index += run;
      continue;
    }

    out.text(char);
    index++;
  }

  return out.done();
}
