import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Carga .env igual que Next.js, para que la CLI de Prisma use las mismas variables.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Las migraciones usan la conexión directa (en Neon, sin pooler).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
