/**
 * Diseños visuales del orbe. Todos expresan las mismas fases con el mismo perfil
 * interpolado (energía, turbulencia, escaneo, búsqueda, emisión…); cambia la forma de dibujarlo.
 */
export const ORB_VARIANTS = [
  "sphere",
  "nebula",
  "atom",
  "wave",
  "crystal",
  "lava",
  "gyro",
  "swarm",
  "pixel",
  "halo",
  "corona",
  "enso",
] as const;

export type OrbVariant = (typeof ORB_VARIANTS)[number];

export const DEFAULT_ORB_VARIANT: OrbVariant = "sphere";

export function isOrbVariant(value: unknown): value is OrbVariant {
  return typeof value === "string" && (ORB_VARIANTS as readonly string[]).includes(value);
}

/** Normaliza el valor del atributo `variant`: uno desconocido usa el diseño por defecto. */
export function toOrbVariant(value: unknown): OrbVariant {
  return isOrbVariant(value) ? value : DEFAULT_ORB_VARIANT;
}
