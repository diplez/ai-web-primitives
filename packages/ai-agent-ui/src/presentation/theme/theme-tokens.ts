import { css } from "lit";

/**
 * Tokens de tema compartidos por todos los componentes.
 *
 * Son las mismas variables `--dz-*` que usa `@diplez/ai-web-primitives`: un tema definido para
 * un paquete se aplica también al otro. Mantener ambos archivos sincronizados.
 *
 * El consumidor personaliza con las variables públicas `--dz-*` (en `:root`, en un contenedor
 * o en un componente puntual). Internamente cada componente usa la versión privada `--_*`,
 * que cae en un valor por defecto cuando la pública no está definida.
 *
 * Los valores por defecto usan `light-dark()`: siguen el `color-scheme` de la página. Si el
 * sitio declara `color-scheme: light dark` (o `dark`), los componentes se adaptan solos.
 */
export const themeTokens = css`
  :host {
    --_accent: var(--dz-accent, light-dark(#6d4aff, #a78bfa));
    --_accent-contrast: var(--dz-accent-contrast, light-dark(#ffffff, #12101c));
    --_text: var(--dz-text, light-dark(#17191f, #e8eaf0));
    --_muted: var(--dz-muted, light-dark(#5d6472, #9aa1ae));
    --_surface: var(--dz-surface, light-dark(#ffffff, #191c23));
    --_surface-raised: var(--dz-surface-raised, light-dark(#f4f5f8, #222630));
    --_border: var(--dz-border, light-dark(#dfe2e8, #323845));
    --_success: var(--dz-success, light-dark(#15803d, #4ade80));
    --_warning: var(--dz-warning, light-dark(#b45309, #fbbf24));
    --_danger: var(--dz-danger, light-dark(#b91c1c, #f87171));
    --_radius: var(--dz-radius, 10px);
    --_font: var(--dz-font, inherit);
    --_font-mono: var(
      --dz-font-mono,
      ui-monospace,
      "Cascadia Code",
      "SF Mono",
      Menlo,
      Consolas,
      monospace
    );
    --_code-bg: var(--dz-code-bg, light-dark(#f4f5f8, #10131a));
    --_focus: var(--dz-focus, var(--_accent));
    font-family: var(--_font);
  }

  :host([hidden]) {
    display: none !important;
  }

  :focus-visible {
    outline: 2px solid var(--_focus);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`;
