/**
 * Reglas del flujo del pedido: qué cambio de estado puede hacer cada rol.
 *
 * Archivo seguro para el navegador: la interfaz lo usa para mostrar SOLO los
 * botones válidos, y el servicio lo usa para RECHAZAR lo demás (el servidor
 * nunca confía en que el botón estuviera oculto).
 *
 *   CREADO → EN_PREPARACION → LISTO → ENTREGADO → COBRADO
 *      └──────────────┴──────────┴────────┴──→ CANCELADO
 */
import { EstadoPedido, Rol } from "@/generated/prisma/enums";

interface Transicion {
  a: EstadoPedido;
  roles: readonly Rol[];
  /** Solo el mesero que creó el pedido. */
  soloDueno?: boolean;
}

const { CREADO, EN_PREPARACION, LISTO, ENTREGADO, COBRADO, CANCELADO } = EstadoPedido;

const TRANSICIONES: Record<EstadoPedido, readonly Transicion[]> = {
  [CREADO]: [
    { a: EN_PREPARACION, roles: [Rol.COCINA] },
    // El mesero puede cancelar solo antes de que cocina empiece.
    { a: CANCELADO, roles: [Rol.MESERO], soloDueno: true },
    { a: CANCELADO, roles: [Rol.CAJERO] },
  ],
  [EN_PREPARACION]: [
    { a: LISTO, roles: [Rol.COCINA] },
    { a: CANCELADO, roles: [Rol.CAJERO] },
  ],
  [LISTO]: [
    { a: ENTREGADO, roles: [Rol.MESERO], soloDueno: true },
    { a: CANCELADO, roles: [Rol.CAJERO] },
  ],
  [ENTREGADO]: [
    { a: COBRADO, roles: [Rol.CAJERO] },
    { a: CANCELADO, roles: [Rol.CAJERO] },
  ],
  [COBRADO]: [],
  [CANCELADO]: [],
};

/** Estados después de los cuales el pedido ya no cambia (se llena cerradoEn). */
export const ESTADOS_FINALES: readonly EstadoPedido[] = [COBRADO, CANCELADO];

/** Estados en los que el mesero todavía puede agregar o editar ítems. */
export const ESTADOS_EDITABLES: readonly EstadoPedido[] = [CREADO, EN_PREPARACION];

/** Solo se pueden quitar ítems antes de que cocina empiece. */
export const ESTADOS_QUITAR_ITEMS: readonly EstadoPedido[] = [CREADO];

/** Estados a los que este usuario puede llevar este pedido ahora. */
export function estadosPermitidos(
  pedido: { estado: EstadoPedido; meseroId: number },
  usuario: { id: number; rol: Rol },
): EstadoPedido[] {
  return TRANSICIONES[pedido.estado]
    .filter(
      (t) => t.roles.includes(usuario.rol) && (!t.soloDueno || pedido.meseroId === usuario.id),
    )
    .map((t) => t.a);
}

/** El mesero dueño puede modificar los ítems mientras el estado lo permita. */
export function puedeEditarItems(
  pedido: { estado: EstadoPedido; meseroId: number },
  usuario: { id: number; rol: Rol },
): boolean {
  return (
    usuario.rol === Rol.MESERO &&
    pedido.meseroId === usuario.id &&
    ESTADOS_EDITABLES.includes(pedido.estado)
  );
}
