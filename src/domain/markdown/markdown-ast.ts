/** Árbol de un documento markdown. Inmutable y sin HTML: la presentación decide cómo pintarlo. */

export type MarkdownInline =
  | { readonly type: "text"; readonly value: string }
  | { readonly type: "strong"; readonly children: readonly MarkdownInline[] }
  | { readonly type: "emphasis"; readonly children: readonly MarkdownInline[] }
  | { readonly type: "strike"; readonly children: readonly MarkdownInline[] }
  | { readonly type: "code"; readonly value: string }
  | {
      readonly type: "link";
      /** URL saneada, o `null` si era insegura o aún no terminó de llegar. */
      readonly href: string | null;
      readonly children: readonly MarkdownInline[];
    }
  | { readonly type: "break" };

export interface MarkdownListItem {
  readonly children: readonly MarkdownInline[];
  /** `true`/`false` en listas de tareas (`- [x]`), `null` en ítems normales. */
  readonly checked: boolean | null;
  readonly sublist: MarkdownList | null;
}

export interface MarkdownList {
  readonly type: "list";
  readonly ordered: boolean;
  readonly start: number;
  readonly items: readonly MarkdownListItem[];
}

export type MarkdownTableAlign = "left" | "center" | "right" | null;

export type MarkdownBlock =
  | {
      readonly type: "heading";
      readonly level: 1 | 2 | 3 | 4 | 5 | 6;
      readonly children: readonly MarkdownInline[];
    }
  | { readonly type: "paragraph"; readonly children: readonly MarkdownInline[] }
  | {
      readonly type: "code";
      readonly language: string;
      readonly value: string;
      /** `false` mientras el bloque de código no recibió su cierre. */
      readonly complete: boolean;
    }
  | MarkdownList
  | { readonly type: "blockquote"; readonly children: readonly MarkdownBlock[] }
  | {
      readonly type: "table";
      readonly align: readonly MarkdownTableAlign[];
      readonly header: readonly (readonly MarkdownInline[])[];
      readonly rows: readonly (readonly (readonly MarkdownInline[])[])[];
    }
  | { readonly type: "rule" };
