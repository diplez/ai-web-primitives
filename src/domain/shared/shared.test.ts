import { parseRgbColor, rgbToHsl } from "./color.js";
import { displayHost, sanitizeHref } from "./safe-url.js";
import { formatMessage } from "./template.js";

describe("sanitizeHref", () => {
  it.each([
    "https://example.com/a?b=1#c",
    "http://example.com",
    "mailto:hola@example.com",
    "/docs",
    "#section",
    "./relative",
    "../up",
    "?q=1",
    "docs/intro",
  ])("permite %s", (href) => {
    expect(sanitizeHref(href)).toBe(href);
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "java\tscript:alert(1)",
    " javascript:alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "file:///etc/passwd",
    "",
  ])("bloquea %j", (href) => {
    expect(sanitizeHref(href)).toBeNull();
  });

  it("extrae el host legible", () => {
    expect(displayHost("https://www.Example.com/path")).toBe("example.com");
    expect(displayHost("/relative")).toBeNull();
  });
});

describe("color", () => {
  it.each([
    ["#f00", { r: 255, g: 0, b: 0 }],
    ["#00ff0080", { r: 0, g: 255, b: 0 }],
    ["rgb(10, 20, 30)", { r: 10, g: 20, b: 30 }],
    ["rgb(10 20 30 / 50%)", { r: 10, g: 20, b: 30 }],
    ["rgba(255,255,255,0.5)", { r: 255, g: 255, b: 255 }],
    ["color(srgb 1 0 0.5)", { r: 255, g: 0, b: 127.5 }],
  ])("interpreta %s", (value, expected) => {
    expect(parseRgbColor(value)).toEqual(expected);
  });

  it("devuelve null para formatos desconocidos", () => {
    expect(parseRgbColor("hotpink")).toBeNull();
    expect(parseRgbColor("#12")).toBeNull();
  });

  it("convierte a HSL", () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
    const blue = rgbToHsl({ r: 0, g: 0, b: 255 });
    expect(blue.h).toBeCloseTo(240);
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
  });
});

describe("formatMessage", () => {
  it("reemplaza marcadores y deja los desconocidos", () => {
    expect(formatMessage("{a} de {b} ({c})", { a: 2, b: 5 })).toBe("2 de 5 ({c})");
  });
});
