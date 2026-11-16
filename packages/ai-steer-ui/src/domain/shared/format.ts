/**
 * Reemplaza los marcadores `{nombre}` de un texto traducible por sus valores.
 * Los marcadores sin valor se dejan tal cual, para que el error sea visible.
 */
export function formatMessage(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (marker, name: string) =>
    name in values ? String(values[name]) : marker,
  );
}
