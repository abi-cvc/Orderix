/**
 * API pública del módulo menu.
 *
 * Frente B (Ricardo): CRUD de productos con búsqueda y paginación.
 * Tabla propia: productos.
 * Sigue el ejemplo de src/modules/calificaciones y las reglas de src/modules/README.md.
 */
export type { ProductoParaPedido } from "./repositorio";
export type { ProductoGuardado } from "./servicio";
export {
  activarProducto,
  crearProducto,
  desactivarProducto,
  editarProducto,
  eliminarProducto,
  listarProductos,
  listarProductosDisponibles,
  obtenerProducto,
  obtenerProductosParaPedido,
} from "./servicio";
