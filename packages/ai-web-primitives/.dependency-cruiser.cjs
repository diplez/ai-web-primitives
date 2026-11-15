/**
 * Reglas de dependencia de Clean Architecture. Se ejecutan con `npm run lint:arch`
 * (incluido en `npm run lint` y en CI). Cualquier import que las viole rompe el build.
 *
 *   domain        → (nadie)
 *   application   → domain
 *   infrastructure→ application, domain
 *   presentation  → application, domain, lit
 *   composition   → todas las capas
 *   index/define  → composition, presentation, domain, infrastructure (solo re-exports)
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      comment: "El dominio no importa nada fuera de sí mismo (ni otras capas, ni paquetes npm).",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { pathNot: "^src/domain/" },
    },
    {
      name: "application-depends-only-on-domain",
      comment: "La aplicación solo conoce al dominio. Lo externo entra por puertos (interfaces).",
      severity: "error",
      from: { path: "^src/application/" },
      to: { pathNot: "^src/(application|domain)/" },
    },
    {
      name: "infrastructure-implements-ports",
      comment:
        "La infraestructura implementa puertos de aplicación; no conoce presentación ni composición.",
      severity: "error",
      from: { path: "^src/infrastructure/" },
      to: { path: "^src/(presentation|composition)/" },
    },
    {
      name: "presentation-has-no-infrastructure",
      comment: "Los componentes reciben dependencias inyectadas; nunca instancian adaptadores.",
      severity: "error",
      from: { path: "^src/presentation/" },
      to: { path: "^src/(infrastructure|composition)/" },
    },
    {
      name: "nobody-depends-on-composition",
      comment: "La composición es el borde externo: solo los entry points públicos la importan.",
      severity: "error",
      from: { path: "^src/(domain|application|infrastructure|presentation)/" },
      to: { path: "^src/composition/" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "Archivos que nadie importa (salvo tests y entry points) suelen ser código muerto.",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "\\.test\\.ts$",
          "^src/(index|define)\\.ts$",
          "^src/composition/[^/]+/define\\.ts$",
          "\\.d\\.ts$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.ts$" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
