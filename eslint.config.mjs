import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";

// ---------------------------------------------------------------------------
// Reglas de arquitectura (ver src/modules/README.md)
// ---------------------------------------------------------------------------

/** Desde fuera de un módulo solo se importa su index, sus validadores, eventos o tipos. */
const importacionesProfundas = {
  group: [
    "@/modules/*/*",
    "!@/modules/*/validadores",
    "!@/modules/*/eventos",
    "!@/modules/*/tipos",
    "!@/modules/*/estados",
    "../*/repositorio",
    "../*/servicio",
  ],
  message:
    "Importa desde la API pública del módulo (@/modules/<modulo>), no sus archivos internos.",
};

const soloRepositorios = [
  {
    name: "@/lib/prisma",
    message: "Solo el repositorio de cada módulo usa Prisma. Llama al servicio del módulo.",
  },
  {
    name: "@/generated/prisma/client",
    message: "Fuera de los repositorios, importa los enums desde @/generated/prisma/enums.",
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next ya registra el plugin jsx-a11y con pocas reglas;
  // aquí se activa el conjunto recomendado completo (WCAG 2.2 AA).
  {
    files: ["**/*.{jsx,tsx}"],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    rules: {
      // Prohibido para prevenir XSS (ver docs/seguridad.md).
      "react/no-danger": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "server.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: soloRepositorios, patterns: [importacionesProfundas] },
      ],
    },
  },
  {
    // Lugares que sí pueden usar Prisma directamente.
    files: ["src/modules/*/repositorio.ts", "src/lib/prisma.ts", "src/app/api/salud/route.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [importacionesProfundas] }],
    },
  },
  // Desactiva reglas de estilo que chocan con Prettier (debe ir al final).
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);
