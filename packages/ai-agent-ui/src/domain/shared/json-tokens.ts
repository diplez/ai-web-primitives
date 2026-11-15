/** Tipos de token para resaltar JSON. */
export type JsonTokenType =
  "key" | "string" | "number" | "boolean" | "null" | "punctuation" | "space";

export interface JsonToken {
  readonly type: JsonTokenType;
  readonly text: string;
}

const TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*")(\s*:)?|(true|false)|(null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\s+)|([\s\S])/g;

/**
 * Formatea un valor como JSON indentado y lo divide en tokens para resaltarlo. El texto de los
 * tokens concatenado es exactamente el JSON formateado: la vista solo pinta, nunca interpreta HTML.
 */
export function tokenizeJson(value: unknown, indent = 2): JsonToken[] {
  const text = JSON.stringify(value, null, indent) ?? String(value);
  const tokens: JsonToken[] = [];
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const [, quoted, colon, boolean, nullLiteral, number, space, other] = match;
    if (quoted !== undefined) {
      tokens.push({ type: colon ? "key" : "string", text: quoted });
      if (colon) tokens.push({ type: "punctuation", text: colon });
    } else if (boolean !== undefined) tokens.push({ type: "boolean", text: boolean });
    else if (nullLiteral !== undefined) tokens.push({ type: "null", text: nullLiteral });
    else if (number !== undefined) tokens.push({ type: "number", text: number });
    else if (space !== undefined) tokens.push({ type: "space", text: space });
    else tokens.push({ type: "punctuation", text: other ?? "" });
  }
  return tokens;
}
