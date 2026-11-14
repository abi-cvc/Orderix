/**
 * Cliente de Prisma para los scripts de semilla (fuera de la aplicación).
 * Usa la conexión directa, igual que las migraciones.
 */
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

loadEnvConfig(process.cwd());

export function crearClienteScript(): PrismaClient {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (o DIRECT_URL) en el entorno");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
