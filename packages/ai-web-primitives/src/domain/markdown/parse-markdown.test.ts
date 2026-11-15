import type { MarkdownBlock, MarkdownInline } from "./markdown-ast.js";
import { parseInline } from "./parse-inline.js";
import { parseMarkdown } from "./parse-markdown.js";

const text = (value: string): MarkdownInline => ({ type: "text", value });

describe("parseInline", () => {
  it("reconoce negrita, cursiva, tachado y código", () => {
    expect(parseInline("a **b** *c* ~~d~~ `e`")).toEqual([
      text("a "),
      { type: "strong", children: [text("b")] },
      text(" "),
      { type: "emphasis", children: [text("c")] },
      text(" "),
      { type: "strike", children: [text("d")] },
      text(" "),
      { type: "code", value: "e" },
    ]);
  });

  it("anida énfasis dentro de negrita", () => {
    expect(parseInline("**a *b* c**")).toEqual([
      {
        type: "strong",
        children: [text("a "), { type: "emphasis", children: [text("b")] }, text(" c")],
      },
    ]);
  });

  it("no interpreta guiones bajos dentro de palabras", () => {
    expect(parseInline("snake_case_name")).toEqual([text("snake_case_name")]);
  });

  it("no busca formato dentro del código", () => {
    expect(parseInline("`a*b*c`")).toEqual([{ type: "code", value: "a*b*c" }]);
  });

  it("respeta los escapes", () => {
    expect(parseInline("\\*no\\*")).toEqual([text("*no*")]);
  });

  it("crea enlaces y bloquea URLs peligrosas", () => {
    expect(parseInline("[doc](https://x.com/a)")).toEqual([
      { type: "link", href: "https://x.com/a", children: [text("doc")] },
    ]);
    expect(parseInline("[x](javascript:alert(1))")).toEqual([
      { type: "link", href: null, children: [text("x")] },
    ]);
  });

  it("muestra las imágenes como enlaces (no carga recursos)", () => {
    expect(parseInline("![logo](https://x.com/l.png)")).toEqual([
      { type: "link", href: "https://x.com/l.png", children: [text("logo")] },
    ]);
  });

  it("enlaza URLs sueltas sin la puntuación final", () => {
    expect(parseInline("ver https://x.com/a.")).toEqual([
      text("ver "),
      { type: "link", href: "https://x.com/a", children: [text("https://x.com/a")] },
      text("."),
    ]);
    expect(parseInline("(https://x.com/a)")).toEqual([
      text("("),
      { type: "link", href: "https://x.com/a", children: [text("https://x.com/a")] },
      text(")"),
    ]);
  });

  it("reconoce saltos de línea duros", () => {
    expect(parseInline("a  \nb")).toEqual([text("a  "), { type: "break" }, text("b")]);
  });

  describe("en streaming", () => {
    it("cierra la negrita sin cierre", () => {
      expect(parseInline("hola **mun", true)).toEqual([
        text("hola "),
        { type: "strong", children: [text("mun")] },
      ]);
    });

    it("cierra el código sin cierre", () => {
      expect(parseInline("usa `npm i", true)).toEqual([
        text("usa "),
        { type: "code", value: "npm i" },
      ]);
    });

    it("oculta un delimitador suelto al final", () => {
      expect(parseInline("hola **", true)).toEqual([text("hola ")]);
    });

    it("muestra el texto de un enlace sin usar la URL incompleta", () => {
      expect(parseInline("ver [la doc](https://x.co", true)).toEqual([
        text("ver "),
        { type: "link", href: null, children: [text("la doc")] },
      ]);
      expect(parseInline("ver [la d", true)).toEqual([
        text("ver "),
        { type: "link", href: null, children: [text("la d")] },
      ]);
    });

    it("sin streaming, el formato sin cierre queda como texto", () => {
      expect(parseInline("hola **mun")).toEqual([text("hola **mun")]);
    });
  });
});

describe("parseMarkdown", () => {
  it("reconoce encabezados, párrafos y separadores", () => {
    expect(parseMarkdown("# Título\n\nUn párrafo\nen dos líneas\n\n---")).toEqual([
      { type: "heading", level: 1, children: [text("Título")] },
      { type: "paragraph", children: [text("Un párrafo\nen dos líneas")] },
      { type: "rule" },
    ]);
  });

  it("reconoce bloques de código con lenguaje", () => {
    expect(parseMarkdown("```ts\nconst a = 1;\n```")).toEqual([
      { type: "code", language: "ts", value: "const a = 1;", complete: true },
    ]);
  });

  it("un bloque de código sin cierre queda incompleto", () => {
    expect(parseMarkdown("```py\nprint(1)")).toEqual([
      { type: "code", language: "py", value: "print(1)", complete: false },
    ]);
  });

  it("reconoce listas anidadas, ordenadas y de tareas", () => {
    const [list] = parseMarkdown("1. uno\n2. dos\n   - a\n   - [x] b\n3. tres") as [
      Extract<MarkdownBlock, { type: "list" }>,
    ];
    expect(list.ordered).toBe(true);
    expect(list.items).toHaveLength(3);
    const sublist = list.items[1]!.sublist!;
    expect(sublist.ordered).toBe(false);
    expect(sublist.items[1]).toEqual({ children: [text("b")], checked: true, sublist: null });
  });

  it("mantiene la lista con líneas en blanco entre ítems", () => {
    const blocks = parseMarkdown("- a\n\n- b");
    expect(blocks).toHaveLength(1);
  });

  it("reconoce tablas con alineación", () => {
    const [table] = parseMarkdown("| a | b |\n|:--|--:|\n| 1 | 2 |") as [
      Extract<MarkdownBlock, { type: "table" }>,
    ];
    expect(table.type).toBe("table");
    expect(table.align).toEqual(["left", "right"]);
    expect(table.rows[0]).toEqual([[text("1")], [text("2")]]);
  });

  it("reconoce citas con contenido anidado", () => {
    expect(parseMarkdown("> **ojo**\n> sigue")).toEqual([
      {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: [{ type: "strong", children: [text("ojo")] }, text("\nsigue")],
          },
        ],
      },
    ]);
  });

  describe("en streaming", () => {
    it("retiene una tabla hasta recibir su separador", () => {
      expect(parseMarkdown("Texto\n\n| a | b |", { streaming: true })).toEqual([
        { type: "paragraph", children: [text("Texto")] },
      ]);
      expect(parseMarkdown("Texto\n\n| a | b |\n|--", { streaming: true })).toHaveLength(1);
      expect(parseMarkdown("| a | b |\n|---|---|", { streaming: true })[0]).toMatchObject({
        type: "table",
      });
    });

    it("retiene un marcador de lista solo al final", () => {
      expect(parseMarkdown("Hola\n\n-", { streaming: true })).toHaveLength(1);
    });
  });

  it("normaliza saltos de línea de Windows", () => {
    expect(parseMarkdown("a\r\nb")).toEqual([{ type: "paragraph", children: [text("a\nb")] }]);
  });
});
