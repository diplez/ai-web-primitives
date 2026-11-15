import { formatDuration, formatMessage, formatOffset, truncate } from "./format.js";
import { tokenizeJson } from "./json-tokens.js";
import { parsePartialJson } from "./partial-json.js";

describe("parsePartialJson", () => {
  it("devuelve null si todavía no llegó nada", () => {
    expect(parsePartialJson("")).toBeNull();
    expect(parsePartialJson("   ")).toBeNull();
  });

  it("marca como completo un JSON válido", () => {
    expect(parsePartialJson('{"a":1}')).toEqual({ value: { a: 1 }, complete: true });
  });

  it("cierra un string abierto dentro de un objeto", () => {
    expect(parsePartialJson('{"query": "pagin')).toEqual({
      value: { query: "pagin" },
      complete: false,
    });
  });

  it("descarta una clave a medias o sin valor", () => {
    expect(parsePartialJson('{"a": 1, "ke')?.value).toEqual({ a: 1 });
    expect(parsePartialJson('{"a": 1, "key":')?.value).toEqual({ a: 1 });
    expect(parsePartialJson('{"a": 1, "key": ')?.value).toEqual({ a: 1 });
  });

  it("descarta literales incompletos", () => {
    expect(parsePartialJson('{"a": 1, "ok": tr')?.value).toEqual({ a: 1 });
  });

  it("cierra arrays y objetos anidados y quita comas finales", () => {
    expect(parsePartialJson('{"items": [1, 2, ')?.value).toEqual({ items: [1, 2] });
    expect(parsePartialJson('{"a": {"b": [{"c": "x')?.value).toEqual({ a: { b: [{ c: "x" }] } });
  });

  it("respeta las comillas escapadas y una barra final suelta", () => {
    expect(parsePartialJson('{"q": "di \\"hola')?.value).toEqual({ q: 'di "hola' });
    expect(parsePartialJson('{"q": "linea\\')?.value).toEqual({ q: "linea" });
  });

  it("deja la apertura vacía cuando no hay nada más", () => {
    expect(parsePartialJson("{")?.value).toEqual({});
    expect(parsePartialJson('{"')?.value).toEqual({});
  });

  it("devuelve null para texto que no es JSON", () => {
    expect(parsePartialJson("ls -la")).toBeNull();
  });
});

describe("tokenizeJson", () => {
  it("reconstruye exactamente el JSON formateado", () => {
    const value = { name: "x", n: -1.5e3, ok: true, none: null, list: [1, "a"] };
    const tokens = tokenizeJson(value);
    expect(tokens.map((token) => token.text).join("")).toBe(JSON.stringify(value, null, 2));
  });

  it("distingue claves de strings", () => {
    const tokens = tokenizeJson({ key: "value" });
    expect(tokens.find((token) => token.text === '"key"')?.type).toBe("key");
    expect(tokens.find((token) => token.text === '"value"')?.type).toBe("string");
    expect(tokens.find((token) => token.text === ":")?.type).toBe("punctuation");
  });

  it("clasifica números, booleanos y null", () => {
    const types = tokenizeJson([1, false, null])
      .filter((token) => token.type !== "space" && token.type !== "punctuation")
      .map((token) => token.type);
    expect(types).toEqual(["number", "boolean", "null"]);
  });
});

describe("formato", () => {
  it("formatMessage reemplaza marcadores y deja los desconocidos", () => {
    expect(formatMessage("{count} eventos {x}", { count: 3 })).toBe("3 eventos {x}");
  });

  it("formatDuration usa ms, s y min", () => {
    expect(formatDuration(850.4)).toBe("850 ms");
    expect(formatDuration(1234)).toBe("1.2 s");
    expect(formatDuration(125_000)).toBe("2 min 05 s");
    expect(formatDuration(-5)).toBe("0 ms");
    expect(formatDuration(Number.NaN)).toBe("0 ms");
  });

  it("formatOffset muestra la posición como en un reproductor", () => {
    expect(formatOffset(7_400)).toBe("+0:07");
    expect(formatOffset(92_000)).toBe("+1:32");
    expect(formatOffset(3_725_000)).toBe("+1:02:05");
  });

  it("truncate agrega … solo si corta", () => {
    expect(truncate("hola", 10)).toBe("hola");
    expect(truncate("hola mundo", 5)).toBe("hola…");
  });
});
