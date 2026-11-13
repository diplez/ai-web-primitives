// Valida el formato de los mensajes de commit (hook commit-msg vía simple-git-hooks).
// Formato documentado en README → "Convención de commits".
import { readFileSync } from "node:fs";

const TYPES = ["feat", "fix", "refactor", "chore", "docs", "test", "perf", "style", "build", "ci"];
const MAX_HEADER_LENGTH = 72;

const messageFile = process.argv[2];
if (!messageFile) {
  console.error("validate-commit-msg: falta la ruta del archivo de mensaje.");
  process.exit(1);
}

const lines = readFileSync(messageFile, "utf8")
  .split(/\r?\n/)
  .filter((line) => !line.startsWith("#"));
const header = lines[0] ?? "";

// Commits generados por git: no se validan.
if (/^(Merge|Revert|fixup!|squash!) /.test(header)) process.exit(0);

const errors = [];
const headerPattern = new RegExp(`^(${TYPES.join("|")})(\\([a-z0-9-]+\\))?(!)?: (.+)$`);
const match = headerPattern.exec(header);

if (!match) {
  errors.push(
    `La primera línea debe ser "<tipo>: descripción" o "<tipo>(alcance): descripción".\n` +
      `  Tipos permitidos: ${TYPES.join(", ")}`,
  );
} else {
  const description = match[4];
  if (description !== description.toLowerCase()) errors.push("La descripción va en minúsculas.");
  if (description.endsWith(".")) errors.push("La descripción no termina en punto.");
}
if (header.length > MAX_HEADER_LENGTH) {
  errors.push(`La primera línea tiene ${header.length} caracteres (máximo ${MAX_HEADER_LENGTH}).`);
}
if (lines[1] !== undefined && lines[1].trim() !== "") {
  errors.push("La segunda línea debe estar vacía.");
}

const changesIndex = lines.findIndex((line) => line.trim() === "CAMBIOS:");
if (changesIndex === -1) {
  errors.push('Falta la sección obligatoria "CAMBIOS:".');
} else {
  const items = lines.slice(changesIndex + 1).filter((line) => /^\s+- \S/.test(line));
  if (items.length === 0) errors.push('"CAMBIOS:" debe tener al menos un ítem "       - ...".');
}

if (errors.length > 0) {
  console.error("\n✖ Mensaje de commit inválido:\n");
  for (const error of errors) console.error(`  - ${error}`);
  console.error(
    "\nEjemplo:\n\n  feat(thinking-indicator): agregar fase de reflexión\n\n  CAMBIOS:\n         - nueva fase reflecting en el dominio\n",
  );
  process.exit(1);
}
