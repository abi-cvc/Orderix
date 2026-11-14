/**
 * Repositorio de pedidos: el ÚNICO archivo del módulo que toca la base.
 * Tablas propias: pedidos, items_pedido, cambios_estado.
 *
 * Frente C (Carol): aquí van las consultas del CRUD de pedidos e ítems,
 * los cambios de estado y la consulta por mesero y rango de fechas.
 */
import type { EstadoPedido } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export function buscarEstadoPorId(
  id: number,
): Promise<{ id: number; estado: EstadoPedido } | null> {
  return prisma().pedido.findUnique({ where: { id }, select: { id: true, estado: true } });
}
