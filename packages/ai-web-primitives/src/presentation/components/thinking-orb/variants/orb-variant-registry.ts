import type { OrbVariant } from "../../../../domain/orb/orb-variant.js";
import { drawAtom } from "./atom.js";
import { drawCorona } from "./corona.js";
import { drawCrystal } from "./crystal.js";
import { drawEnso } from "./enso.js";
import { drawGyro } from "./gyro.js";
import { drawHaloRing } from "./halo.js";
import { drawLava } from "./lava.js";
import { drawNebula } from "./nebula.js";
import { drawPixel } from "./pixel.js";
import { drawSphere } from "./sphere.js";
import { drawSwarm } from "./swarm.js";
import type { OrbVariantRenderer } from "./variant-kit.js";
import { drawWave } from "./wave.js";

/** Cómo se dibuja cada diseño. `Record` obliga a cubrir todos los valores de `OrbVariant`. */
export const ORB_VARIANT_RENDERERS: Readonly<Record<OrbVariant, OrbVariantRenderer>> = {
  sphere: drawSphere,
  nebula: drawNebula,
  atom: drawAtom,
  wave: drawWave,
  crystal: drawCrystal,
  lava: drawLava,
  gyro: drawGyro,
  swarm: drawSwarm,
  pixel: drawPixel,
  halo: drawHaloRing,
  corona: drawCorona,
  enso: drawEnso,
};
