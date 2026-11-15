// Graba los GIFs animados de los README a partir de las escenas de cada paquete.
//
//   npm run build -w @diplez/<paquete>     # las escenas usan dist/, igual que un consumidor
//   npm run media -w @diplez/<paquete>     # graba todas las escenas del paquete
//   npm run media -w @diplez/<paquete> -- orbs   # graba solo las indicadas
//   npm run media -w @diplez/<paquete> -- --frames  # además guarda frames PNG para revisarlos
//
// Cada paquete define sus escenas en scripts/media/:
//   scenes.json  → { "outDir": "docs/media/…", "scenes": { "<nombre>": { "fps": 20 } } }
//   scenes.html  → página con un #stage (estilos de la grabación)
//   scenes.mjs   → código de navegador: monta la escena según location.hash y expone
//                  window.runScene(). Para interactuar con el mouse agrega acciones a
//                  window.__actions: { type: "click" | "hover" | "leave", selector }.
//                  Los selectores aceptan ">>>" para entrar en Shadow DOM.
//
// Abre las escenas en un navegador Chromium sin ventana (Edge o Chrome instalados; se puede
// forzar con la variable BROWSER_PATH), captura los frames con el screencast del protocolo
// DevTools y los codifica como GIF. Los README enlazan las imágenes por su URL de GitHub, así
// que no forman parte de los paquetes npm.
import { build } from "esbuild";
import gifenc from "gifenc";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import puppeteer from "puppeteer-core";

const { GIFEncoder, quantize, applyPalette } = gifenc;

/** Cuánto se mantiene el último frame antes de repetir el GIF, en ms. */
const FINAL_HOLD_MS = 2500;
const DEFAULT_FPS = 20;

const root = fileURLToPath(new URL("..", import.meta.url));
// Se ejecuta desde la carpeta del paquete (npm run media -w …) o con su ruta como primer argumento.
const args = process.argv.slice(2).filter((arg) => arg !== "--frames");
const saveFrames = process.argv.includes("--frames");
const packageDir =
  args[0] && existsSync(join(root, "packages", args[0]))
    ? join(root, "packages", args.shift())
    : process.cwd();
const mediaDir = join(packageDir, "scripts", "media");
if (!existsSync(join(mediaDir, "scenes.json"))) {
  console.error(`No hay escenas en ${mediaDir} (falta scenes.json).`);
  process.exit(1);
}
const config = JSON.parse(readFileSync(join(mediaDir, "scenes.json"), "utf8"));
const outDir = resolve(root, config.outDir);

const unknown = args.filter((name) => !(name in config.scenes));
if (unknown.length > 0) {
  console.error(
    `Escenas desconocidas: ${unknown.join(", ")}. Disponibles: ${Object.keys(config.scenes).join(", ")}`,
  );
  process.exit(1);
}
if (!existsSync(join(packageDir, "dist", "index.js"))) {
  console.error("Falta dist/. Ejecuta primero el build del paquete.");
  process.exit(1);
}

function findBrowser() {
  const candidates = [
    process.env.BROWSER_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/microsoft-edge",
  ];
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) {
    console.error("No se encontró Edge ni Chrome. Indica la ruta con BROWSER_PATH.");
    process.exit(1);
  }
  return found;
}

// Página temporal: scenes.html + scenes.mjs bundleado (con el dist/ del paquete incluido).
const workDir = mkdtempSync(join(tmpdir(), "dz-media-"));
await build({
  entryPoints: [join(mediaDir, "scenes.mjs")],
  bundle: true,
  format: "iife",
  outfile: join(workDir, "bundle.js"),
  logLevel: "error",
});
writeFileSync(join(workDir, "scenes.html"), readFileSync(join(mediaDir, "scenes.html")));
mkdirSync(outDir, { recursive: true });
const framesDir = saveFrames ? mkdtempSync(join(tmpdir(), "dz-frames-")) : "";

const browser = await puppeteer.launch({
  executablePath: findBrowser(),
  headless: true,
  args: ["--force-color-profile=srgb", "--hide-scrollbars"],
});

try {
  for (const name of args.length > 0 ? args : Object.keys(config.scenes)) {
    await recordScene(name, config.scenes[name].fps ?? DEFAULT_FPS);
  }
} finally {
  await browser.close();
  rmSync(workDir, { recursive: true, force: true });
}

async function recordScene(name, maxFps) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(join(workDir, "scenes.html")).href}#${name}`);
  await page.evaluate(() => document.fonts.ready);
  await delay(400);
  const box = await (await page.$("#stage")).boundingBox();

  // El screencast emite un frame por cada cambio visual, con su marca de tiempo.
  const frames = [];
  const cdp = await page.createCDPSession();
  cdp.on("Page.screencastFrame", (event) => {
    frames.push({ png: Buffer.from(event.data, "base64"), time: event.metadata.timestamp * 1000 });
    cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });

  let finished = false;
  const run = page.evaluate(() => window.runScene()).then(() => (finished = true));
  let handled = 0;
  let height = 0;
  while (!finished) {
    const state = await page.evaluate(() => ({
      actions: window.__actions ?? [],
      height: Math.ceil(document.querySelector("#stage").getBoundingClientRect().height),
    }));
    height = Math.max(height, state.height);
    for (const action of state.actions.slice(handled)) await perform(page, action);
    handled = state.actions.length;
    await delay(80);
  }
  await run;
  await delay(300);
  await cdp.send("Page.stopScreencast");
  // El screencast puede no emitir el último cambio: se agrega una captura explícita.
  const last = frames.at(-1)?.time ?? 0;
  frames.push({ png: Buffer.from(await page.screenshot({ type: "png" })), time: last + 120 });
  await page.close();

  // Limita la tasa de frames y calcula cuánto dura cada uno.
  const kept = [];
  for (const frame of frames) {
    const previous = kept.at(-1);
    if (!previous || frame === frames.at(-1) || frame.time - previous.time >= 1000 / maxFps) {
      kept.push(frame);
    }
  }

  const width = Math.round(box.width);
  const left = Math.round(box.x);
  const top = Math.round(box.y);
  const gif = GIFEncoder();
  kept.forEach((frame, index) => {
    const png = PNG.sync.read(frame.png);
    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const row = ((y + top) * png.width + left) * 4;
      rgba.set(png.data.subarray(row, row + width * 4), y * width * 4);
    }
    const palette = quantize(rgba, 256);
    const next = kept[index + 1];
    if (saveFrames && (index === Math.floor(kept.length / 2) || index === kept.length - 1)) {
      const sample = new PNG({ width, height });
      sample.data = Buffer.from(rgba);
      const file = join(framesDir, `${name}-${index}.png`);
      writeFileSync(file, PNG.sync.write(sample));
      console.log(`  frame: ${file}`);
    }
    gif.writeFrame(applyPalette(rgba, palette), width, height, {
      palette,
      delay: Math.round(next ? next.time - frame.time : FINAL_HOLD_MS),
    });
  });
  gif.finish();
  const bytes = gif.bytes();
  writeFileSync(join(outDir, `${name}.gif`), bytes);
  console.log(
    `✔ ${name}.gif: ${kept.length} frames, ${width}x${height}, ${(bytes.length / 1024).toFixed(0)} kB`,
  );
}

/** Mueve el mouse de verdad: así se ven los estados hover/focus del componente. */
async function perform(page, action) {
  if (action.type === "leave") {
    await page.mouse.move(5, 5, { steps: 6 });
    return;
  }
  const element = await page.$(action.selector);
  const target = await element?.boundingBox();
  if (!target) {
    console.warn(`  (acción ignorada: no se encontró ${action.selector})`);
    return;
  }
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
  if (action.type === "click") {
    await delay(300);
    await page.mouse.down();
    await page.mouse.up();
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
