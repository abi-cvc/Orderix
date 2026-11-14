/**
 * Servicio de pedidos: la lógica de negocio del módulo.
 *
 * Frente C (Carol): crear pedido, agregar ítems y alergias, cambiar estado
 * (llamando a publicarEvento), listar con filtro y paginación, eliminar.
 */
import type { EstadoPedido } from "@/generated/prisma/enums";
import * as repositorio from "./repositorio";

/** CONTRATO: estado actual de un pedido. Lo usa calificaciones. */
export function obtenerEstadoPedido(
  pedidoId: number,
): Promise<{ id: number; estado: EstadoPedido } | null> {
  return repositorio.buscarEstadoPorId(pedidoId);
}
