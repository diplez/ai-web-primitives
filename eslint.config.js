import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import lit from "eslint-plugin-lit";
import wc from "eslint-plugin-wc";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/", "**/coverage/", "**/node_modules/", "**/custom-elements.json"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.ts"],
    languageOptions: { globals: globals.browser },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      // Nomenclatura (ver README → Estándares de código).
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"], leadingUnderscore: "forbid" },
        { selector: "import", format: ["camelCase", "PascalCase"] },
        {
          selector: "variable",
          modifiers: ["const", "global"],
          format: ["camelCase", "UPPER_CASE"],
        },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["PascalCase"] },
        { selector: "objectLiteralProperty", format: null },
        { selector: "typeProperty", format: null },
      ],
    },
  },

  // Componentes Lit (capa de presentación).
  {
    files: ["packages/*/src/presentation/**/*.ts"],
    plugins: { lit, wc },
    rules: {
      ...lit.configs.recommended.rules,
      ...wc.configs.recommended.rules,
      ...wc.configs["best-practice"].rules,
    },
  },

  // Tests: permisos relajados.
  {
    files: ["**/*.test.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "wc/no-constructor-attributes": "off",
    },
  },

  // Scripts de Node.
  {
    files: ["**/scripts/**/*.mjs", "**/*.config.{js,mjs,cjs}", "**/.dependency-cruiser.cjs"],
    languageOptions: { globals: globals.node },
    rules: { "no-console": "off", "@typescript-eslint/no-require-imports": "off" },
  },

  // GIFs del README: las escenas y los callbacks de page.evaluate() corren en el navegador.
  {
    files: ["packages/*/scripts/media/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  prettier,
);
