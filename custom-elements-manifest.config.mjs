/**
 * El analizador infiere eventos de las llamadas a `dispatchEvent(new CustomEvent(x))`; cuando el
 * nombre viene en una variable, registra eventos falsos ("", "name"). Los eventos reales se
 * documentan con `@fires` y siempre llevan el prefijo `dz-`.
 */
const keepRealEvents = {
  name: "keep-real-events",
  packageLinkPhase({ customElementsManifest }) {
    for (const module of customElementsManifest.modules) {
      for (const declaration of module.declarations ?? []) {
        if (declaration.events) {
          declaration.events = declaration.events.filter((event) => event.name?.startsWith("dz-"));
        }
      }
    }
  },
};

export default {
  globs: ["src/presentation/**/*.ts"],
  exclude: ["src/**/*.test.ts", "src/**/*.styles.ts"],
  litelement: true,
  outdir: ".",
  plugins: [keepRealEvents],
};
