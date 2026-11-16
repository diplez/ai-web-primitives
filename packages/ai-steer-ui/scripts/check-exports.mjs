// Verifica exports y tipos del paquete con @arethetypeswrong/cli.
// `attw --pack` empaqueta internamente con `npm pack`; si se ejecuta dentro de
// `npm publish --dry-run` hereda npm_config_dry_run=true y el .tgz nunca se crea.
// Por eso se lanza con ese flag removido del entorno.
import { spawnSync } from "node:child_process";

const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (key.toLowerCase() === "npm_config_dry_run") delete env[key];
}

const result = spawnSync("attw", ["--pack", ".", "--profile", "esm-only"], {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status ?? 1);
