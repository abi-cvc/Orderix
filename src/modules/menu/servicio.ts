/**
 * Servicio de menu.
 *
 * Frente B (Ricardo): aquí va el CRUD de productos (solo ADMINISTRADOR escribe),
 * siguiendo el patrón de calificaciones/servicio.ts.
 *
 * Las dos funciones de abajo son CONTRATOS que usa el módulo pedidos.
 */
import * as repositorio from "./repositorio";

/**
 * CONTRATO (pedidos): productos con esos ids, para copiar nombre y precio al
 * crear un pedido. Los que no existen simplemente no vienen en la respuesta.
 */
export function obtenerProductosParaPedido(
  ids: number[],
): Promise<repositorio.ProductoParaPedido[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return repositorio.buscarPorIds([...new Set(ids)]);
}

/** CONTRATO (pedidos): productos disponibles para el formulario de nuevo pedido. */
export function listarProductosDisponibles(): Promise<repositorio.ProductoParaPedido[]> {
  return repositorio.listarDisponibles();
}
