/**
 * Quita la sangría común de un texto escrito dentro de HTML indentado, y las líneas en
 * blanco del principio y del final. Así el markdown escrito así funciona como se espera:
 *
 * ```html
 *     <dz-markdown>
 *       # Título
 *       Texto
 *     </dz-markdown>
 * ```
 */
export function dedent(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[0]!.trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === "") lines.pop();

  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => /^[ \t]*/.exec(line)![0].length);
  const common = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(common)).join("\n");
}
