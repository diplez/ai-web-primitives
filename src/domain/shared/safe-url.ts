const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Devuelve una URL segura para usar en `href`, o `null` si no lo es.
 *
 * Permite `http:`, `https:`, `mailto:` y rutas relativas (`/`, `#`, `./`, `../`, `?`).
 * Bloquea cualquier otro esquema (`javascript:`, `data:`, `vbscript:`, …), incluidos los
 * intentos de ofuscarlos con espacios o caracteres de control (`java\tscript:`).
 */
export function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  // Los navegadores ignoran espacios y caracteres de control al interpretar el esquema.
  // eslint-disable-next-line no-control-regex
  const compact = trimmed.replace(/[\u0000- \u007f]/g, "");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);

  if (scheme) {
    return ALLOWED_SCHEMES.has(`${scheme[1]!.toLowerCase()}:`) ? trimmed : null;
  }
  if (/^(\/|#|\.\.?\/|\?)/.test(compact)) return trimmed;
  // Sin esquema ni prefijo relativo explícito (p. ej. "docs/intro"): ruta relativa.
  return /^[\w-]/.test(compact) ? trimmed : null;
}

/** Nombre de host legible de una URL absoluta (sin `www.`), o `null`. */
export function displayHost(href: string): string | null {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(href.trim());
  return match ? match[1]!.replace(/^www\./i, "").toLowerCase() : null;
}
