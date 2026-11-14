import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Cliente único de Prisma para todo el proceso.
 *
 * Solo lo importan los repositorios de cada módulo. Una página o un componente
 * nunca lo usan directamente: siempre pasan por un servicio.
 *
 * En desarrollo se guarda en globalThis para que la recarga en caliente no abra
 * una conexión nueva cada vez.
 */
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function prisma(): PrismaClient {
  if (!globalParaPrisma.prisma) {
    const adapter = new PrismaPg({ connectionString: env().DATABASE_URL });
    globalParaPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalParaPrisma.prisma;
}
