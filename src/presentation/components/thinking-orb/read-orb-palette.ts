import type { OrbPalette } from "../../../domain/orb/orb-profile.js";
import { parseRgbColor, rgbToHsl, type HslColor } from "../../../domain/shared/color.js";

type StyleReader = Pick<CSSStyleDeclaration, "getPropertyValue">;

/** Normaliza cualquier color CSS (`hotpink`, `oklch(…)`, `var(--x)`) a `rgb(…)`. */
export type ColorResolver = (cssColor: string) => string;

const readNumber = (style: StyleReader, property: string): number | undefined => {
  const raw = style.getPropertyValue(property).trim();
  if (raw === "") return undefined;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : undefined;
};

const readColor = (
  style: StyleReader,
  property: string,
  resolveColor: ColorResolver | undefined,
): HslColor | undefined => {
  const raw = style.getPropertyValue(property).trim();
  if (raw === "") return undefined;
  const rgb = parseRgbColor(raw) ?? (resolveColor ? parseRgbColor(resolveColor(raw)) : null);
  return rgb ? rgbToHsl(rgb) : undefined;
};

/** Desfase del acento respecto del color principal cuando solo se define `--dz-orb-color`. */
const DERIVED_ACCENT_SHIFT = -32;

/**
 * Lee los colores que el consumidor definió en CSS. Acepta dos estilos:
 *
 * - Colores CSS: `--dz-orb-color` y `--dz-orb-accent` (`#ff0066`, `hotpink`, `var(--dz-accent)`…).
 * - Números: `--dz-orb-hue`, `--dz-orb-accent-hue` (0–360) y `--dz-orb-saturation` (0–100).
 *
 * Los colores CSS tienen prioridad. Devuelve `undefined` si no hay nada definido.
 */
export function readOrbPalette(
  style: StyleReader,
  resolveColor?: ColorResolver,
): OrbPalette | undefined {
  const color = readColor(style, "--dz-orb-color", resolveColor);
  const accent = readColor(style, "--dz-orb-accent", resolveColor);

  const hue = color?.h ?? readNumber(style, "--dz-orb-hue");
  const explicitAccentHue = accent?.h ?? readNumber(style, "--dz-orb-accent-hue");
  const accentHue =
    explicitAccentHue ?? (color ? (color.h + DERIVED_ACCENT_SHIFT + 360) % 360 : undefined);
  const saturation = color?.s ?? readNumber(style, "--dz-orb-saturation");

  const palette: OrbPalette = { hue, accentHue, saturation };
  return Object.values(palette).some((value) => value !== undefined) ? palette : undefined;
}
