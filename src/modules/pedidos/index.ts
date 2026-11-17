/**
 * API pública del módulo pedidos (frente C).
 * Tablas propias: pedidos, items_pedido, cambios_estado.
 *
 * Los validadores y las reglas de estado (estados.ts) se importan directo
 * porque también los usa el navegador.
 */
export type { CambioGuardado, ItemGuardado, PedidoGuardado } from "./servicio";
export {
  agregarItems,
  cambiarEstado,
  colaCocina,
  crearPedido,
  editarItem,
  listarPedidos,
  obtenerEstadoPedido,
  obtenerPedido,
  pedidosDeMeseroEntreFechas,
  pedidosPorCobrar,
  quitarItem,
} from "./servicio";
