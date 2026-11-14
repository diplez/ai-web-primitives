// Genera tipos para usar los componentes en JSX (React) y en plantillas de Vue, a partir de
// custom-elements.json. Así cada componente nuevo obtiene sus tipos sin escribirlos a mano.
//
//   dist/frameworks/react.d.ts → declare module "react" { namespace JSX { IntrinsicElements } }
//   dist/frameworks/vue.d.ts   → declare module "vue" { interface GlobalComponents }
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../custom-elements.json", import.meta.url)));
const outDir = new URL("../dist/frameworks/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const elements = manifest.modules
  .flatMap((module) => module.declarations ?? [])
  .filter((declaration) => declaration.tagName)
  .map((declaration) => {
    const fields = (declaration.members ?? []).filter(
      (member) =>
        member.kind === "field" &&
        !member.static &&
        member.privacy !== "private" &&
        member.privacy !== "protected",
    );
    return {
      tag: declaration.tagName,
      className: declaration.name,
      properties: fields.map((field) => field.name),
      // Atributos cuyo nombre difiere de la propiedad (show-label → showLabel).
      aliases: fields
        .filter((field) => field.attribute && field.attribute !== field.name)
        .map((field) => ({ attribute: field.attribute, property: field.name })),
      events: (declaration.events ?? []).map((event) => event.name),
    };
  })
  .sort((a, b) => a.tag.localeCompare(b.tag));

const header = `// Generado por scripts/generate-framework-types.mjs a partir de custom-elements.json. No editar.\n`;
const classImports = `import type { ${elements.map((element) => element.className).join(", ")} } from "../index.js";\n`;
const quote = (value) => JSON.stringify(value);
const pick = (element) =>
  element.properties.length > 0
    ? `Partial<Pick<${element.className}, ${element.properties.map(quote).join(" | ")}>>`
    : "{}";
const aliases = (element) =>
  element.aliases.length > 0
    ? ` & { ${element.aliases
        .map(
          ({ attribute, property }) =>
            `${quote(attribute)}?: ${element.className}[${quote(property)}]`,
        )
        .join("; ")} }`
    : "";

// ---- React ---------------------------------------------------------------------------------
const reactEntries = elements
  .map(
    (element) =>
      `      /** Eventos: ${element.events.join(", ") || "—"} (usar ref + addEventListener). */\n` +
      `      ${quote(element.tag)}: DzElementProps<${element.className}> & ${pick(element)}${aliases(element)};`,
  )
  .join("\n");

const react = `${header}import type { DetailedHTMLProps, HTMLAttributes } from "react";
${classImports}
type DzElementProps<T extends HTMLElement> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  class?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
${reactEntries}
    }
  }
}

export {};
`;

// ---- Vue -----------------------------------------------------------------------------------
const vueEntries = elements
  .map(
    (element) => `    ${quote(element.tag)}: DefineComponent<${pick(element)}${aliases(element)}>;`,
  )
  .join("\n");

const vue = `${header}import type { DefineComponent } from "vue";
${classImports}
declare module "vue" {
  interface GlobalComponents {
${vueEntries}
  }
}

export {};
`;

writeFileSync(new URL("react.d.ts", outDir), react);
writeFileSync(new URL("vue.d.ts", outDir), vue);
writeFileSync(new URL("react.js", outDir), "export {};\n");
writeFileSync(new URL("vue.js", outDir), "export {};\n");
console.log(`✔ tipos de React y Vue generados para ${elements.length} componentes`);
