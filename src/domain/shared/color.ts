export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface HslColor {
  /** Matiz, 0–360. */
  readonly h: number;
  /** Saturación, 0–100. */
  readonly s: number;
  /** Luminosidad, 0–100. */
  readonly l: number;
}

const clamp255 = (value: number): number => Math.min(255, Math.max(0, value));

const channel = (token: string): number => {
  const value = Number.parseFloat(token);
  return token.trim().endsWith("%") ? clamp255((value / 100) * 255) : clamp255(value);
};

/**
 * Interpreta un color sRGB serializado: `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`
 * (con comas o espacios) y `color(srgb r g b)`. Devuelve `null` si no lo reconoce.
 * Es lo que devuelven los navegadores al normalizar colores con `getComputedStyle`.
 */
export function parseRgbColor(value: string): RgbColor | null {
  const text = value.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3,8})$/.exec(text)?.[1];
  if (hex && [3, 4, 6, 8].includes(hex.length)) {
    const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join("") : hex;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = /^rgba?\(([^)]+)\)$/.exec(text)?.[1];
  if (rgb) {
    const parts = rgb.split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    return { r: channel(parts[0]!), g: channel(parts[1]!), b: channel(parts[2]!) };
  }

  const srgb = /^color\(srgb\s+([^)]+)\)$/.exec(text)?.[1];
  if (srgb) {
    const parts = srgb.split(/[\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const unit = (token: string): number =>
      token.endsWith("%")
        ? clamp255((Number.parseFloat(token) / 100) * 255)
        : clamp255(Number.parseFloat(token) * 255);
    return { r: unit(parts[0]!), g: unit(parts[1]!), b: unit(parts[2]!) };
  }

  return null;
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l: lightness * 100 };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return { h: (hue * 60 + 360) % 360, s: saturation * 100, l: lightness * 100 };
}
