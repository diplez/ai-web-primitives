// Graba los GIFs animados del README (docs/media/*.gif) a partir de scenes.mjs.
//
//   npm run build            # las escenas usan dist/, igual que un consumidor
//   npm run media            # graba todas las escenas
//   npm run media -- orbs    # graba solo las indicadas
//
// Abre las escenas en un navegador Chromium sin ventana (Edge o Chrome instalados; se puede
// forzar con la variable BROWSER_PATH), captura los frames con el screencast del protocolo
// DevTools y los codifica como GIF. Las imágenes se enlazan desde el README con su URL de GitHub,
// así que no forman parte del paquete npm.
import { build } from "esbuild";
import gifenc from "gifenc";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import puppeteer from "puppeteer-core";

const { GIFEncoder, quantize, applyPalette } = gifenc;

/** Escenas disponibles y su tasa máxima de frames (la galería de orbes pesa más). */
const SCENES = { orbs: 12, markdown: 20, reasoning: 20, approval: 20, citation: 20 };
/** Cuánto se mantiene el último frame antes de repetir el GIF, en ms. */
const FINAL_HOLD_MS = 2500;

const here = fileURLToPath(new URL(".", import.meta.url));
const outDir = fileURLToPath(new URL("../../../../docs/media/", import.meta.url));

const requested = process.argv.slice(2);
const unknown = requested.filter((name) => !(name in SCENES));
if (unknown.length > 0) {
  console.error(
    `Escenas desconocidas: ${unknown.join(", ")}. Disponibles: ${Object.keys(SCENES).join(", ")}`,
  );
  process.exit(1);
}
if (!existsSync(fileURLToPath(new URL("../../dist/index.js", import.meta.url)))) {
  console.error("Falta dist/. Ejecuta primero: npm run build");
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

// Página temporal: scenes.html + scenes.mjs bundleado (con dist/ incluido).
const workDir = mkdtempSync(join(tmpdir(), "dz-media-"));
await build({
  entryPoints: [join(here, "scenes.mjs")],
  bundle: true,
  format: "iife",
  outfile: join(workDir, "bundle.js"),
  logLevel: "error",
});
writeFileSync(join(workDir, "scenes.html"), readFileSync(join(here, "scenes.html")));
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findBrowser(),
  headless: true,
  args: ["--force-color-profile=srgb", "--hide-scrollbars"],
});

try {
  for (const name of requested.length > 0 ? requested : Object.keys(SCENES)) {
    await recordScene(name, SCENES[name]);
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
  let clicked = false;
  let hovered;
  let height = 0;
  while (!finished) {
    const state = await page.evaluate(() => ({
      click: window.__clickApprove,
      hover: window.__hover,
      height: Math.ceil(document.querySelector("#stage").getBoundingClientRect().height),
    }));
    height = Math.max(height, state.height);
    if (state.click && !clicked) {
      clicked = true;
      await clickApprove(page);
    }
    if (state.hover !== undefined && state.hover !== hovered) {
      hovered = state.hover;
      if (hovered >= 0) await (await page.$$("dz-citation"))[hovered].hover();
      else await page.mouse.move(5, 5);
    }
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

/** Lleva el mouse hasta "Aprobar" y aprueba, para que el GIF muestre la interacción real. */
async function clickApprove(page) {
  const button = await page.evaluateHandle(() =>
    document.querySelector("#card").shadowRoot.querySelector("button.approve"),
  );
  const target = await button.asElement().boundingBox();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
  await delay(350);
  await page.mouse.down();
  await page.mouse.up();
  await page.evaluate(() => {
    const card = document.querySelector("#card");
    if (card.status === "pending") card.approve();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
