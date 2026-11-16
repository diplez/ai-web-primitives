// Verifica que los entry points con efecto secundario (`*/define`) sigan registrando los componentes
// cuando el consumidor usa un bundler que respeta `sideEffects` (Vite, webpack, Rollup, esbuild).
//
// Bundlea cada entrada tal como lo haría una app (con tree-shaking) y cuenta las llamadas a
// `registry.define(` que sobreviven. Como el bundler elimina las funciones que nadie llama, cada
// llamada que queda corresponde a un `define<Componente>()` realmente ejecutado.
//   - `<paquete>/define`               → debe registrar todos los componentes
//   - `<paquete>/<componente>/define`  → debe registrar exactamente uno
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const componentEntries = Object.keys(pkg.exports).filter((subpath) =>
  /^\.\/[^/]+\/define$/.test(subpath),
);
const entries = [
  { subpath: "./define", expected: componentEntries.length },
  ...componentEntries.map((subpath) => ({ subpath, expected: 1 })),
];

let failed = false;

for (const { subpath, expected } of entries) {
  const specifier = `${pkg.name}${subpath.slice(1)}`;
  const result = await build({
    stdin: { contents: `import "${specifier}";`, resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: "esm",
    minify: false,
    treeShaking: true,
    external: ["lit", "lit/*"],
    logLevel: "silent",
  });

  const code = result.outputFiles[0].text;
  const registrations = code.split("registry.define(").length - 1;

  if (registrations !== expected) {
    failed = true;
    console.error(
      `✖ ${specifier}: registra ${registrations} componente(s), se esperaban ${expected}`,
    );
    for (const warning of result.warnings.filter((w) => w.id === "ignored-bare-import")) {
      console.error(`    pista: ${warning.text}`);
    }
  } else {
    console.log(`✔ ${specifier} registra ${registrations} componente(s)`);
  }
}

process.exit(failed ? 1 : 0);
