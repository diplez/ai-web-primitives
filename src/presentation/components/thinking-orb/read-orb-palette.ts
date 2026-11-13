import type { OrbPalette } from "../../../domain/orb/orb-profile.js";

type StyleReader = Pick<CSSStyleDeclaration, "getPropertyValue">;

const readNumber = (style: StyleReader, property: string): number | undefined => {
  const raw = style.getPropertyValue(property).trim();
  if (raw === "") return undefined;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : undefined;
};

/**
 * Lee los colores que el consumidor definió con CSS custom properties:
 * `--dz-orb-hue`, `--dz-orb-accent-hue` y `--dz-orb-saturation` (números).
 * Devuelve `undefined` si no definió ninguno.
 */
export function readOrbPalette(style: StyleReader): OrbPalette | undefined {
  const palette: OrbPalette = {
    hue: readNumber(style, "--dz-orb-hue"),
    accentHue: readNumber(style, "--dz-orb-accent-hue"),
    saturation: readNumber(style, "--dz-orb-saturation"),
  };
  return Object.values(palette).some((value) => value !== undefined) ? palette : undefined;
}
