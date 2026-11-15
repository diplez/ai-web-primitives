/**
 * Reemplaza los marcadores `{nombre}` de un texto traducible por sus valores.
 * Los marcadores sin valor se dejan tal cual, para que el error sea visible.
 *
 * @example formatMessage("{count} events", { count: 4 }) // "4 events"
 */
export function formatMessage(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (marker, name: string) =>
    name in values ? String(values[name]) : marker,
  );
}

/**
 * Duración legible y neutra de idioma: `850 ms`, `1.2 s`, `2 min 05 s`.
 * Valores negativos o no finitos se tratan como 0.
 */
export function formatDuration(milliseconds: number): string {
  const ms = Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 0;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(Math.floor(ms / 100) / 10).toFixed(1)} s`;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

/** Desplazamiento desde el inicio, como en un reproductor: `+0:07`, `+1:32`, `+1:02:05`. */
export function formatOffset(milliseconds: number): string {
  const totalSeconds = Math.floor(
    Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0) / 1000,
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `+${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `+${minutes}:${seconds}`;
}

/** Recorta un texto a `maxLength` caracteres, agregando `…` si se cortó. */
export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}
