import { defineConfig } from "tsup";

export default defineConfig({
  // Entradas públicas: API sin efectos (index), registro global (define) y registro por componente.
  entry: ["src/index.ts", "src/define.ts", "src/composition/*/define.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  target: "es2021",
  // Lit queda como dependency para que la app consumidora deduplique una sola copia.
  external: ["lit", /^lit\//],
});
