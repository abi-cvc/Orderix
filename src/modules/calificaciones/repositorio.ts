/**
 * Repositorio de calificaciones: el ÚNICO archivo del módulo que toca la base.
 * Tabla propia: calificaciones.
 *
 * Reglas para cualquier repositorio:
 * - Solo consulta las tablas de su módulo.
 * - Devuelve objetos simples (con `select`), nunca el modelo completo si no hace falta.
 * - No valida ni decide permisos: eso es del servicio.
 */
import { Prisma } from "@/generated/prisma/client";
import { ErrorConflicto } from "@/lib/errores";
import { prisma } from "@/lib/prisma";

const campos = { id: true, pedidoId: true, puntaje: true, fecha: true } as const;

export type CalificacionGuardada = Prisma.CalificacionGetPayload<{ select: typeof campos }>;

export function buscarPorPedido(pedidoId: number): Promise<CalificacionGuardada | null> {
  return prisma().calificacion.findUnique({ where: { pedidoId }, select: campos });
}

export async function crear(datos: {
  pedidoId: number;
  puntaje: number;
  cajeroId: number;
}): Promise<CalificacionGuardada> {
  try {
    return await prisma().calificacion.create({ data: datos, select: campos });
  } catch (error) {
    // P2002 = violación de unicidad: dos calificaciones del mismo pedido al mismo tiempo.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ErrorConflicto("Este pedido ya fue calificado.");
    }
    throw error;
  }
}

/** Para el reporte por mesero: calificaciones de una lista de pedidos. */
export function listarPorPedidos(pedidoIds: number[]): Promise<CalificacionGuardada[]> {
  return prisma().calificacion.findMany({
    where: { pedidoId: { in: pedidoIds } },
    select: campos,
  });
}
