/**
 * CONTRATO: menú de navegación por rol. Cada pantalla nueva se agrega aquí
 * con los roles que la ven. Cambia solo con un PR revisado por los cuatro.
 *
 * Ocultar un enlace NO protege la pantalla: cada página igual llama a
 * `usuarioDePagina(...roles)` (src/lib/pagina.ts).
 */
import { EstadoPedido, Rol } from "@/generated/prisma/enums";

export interface ElementoNavegacion {
  href: string;
  etiqueta: string;
  roles: readonly Rol[];
}

const TODOS = Object.values(Rol);

export const NAVEGACION: readonly ElementoNavegacion[] = [
  { href: "/", etiqueta: "Inicio", roles: TODOS },
  { href: "/pedidos", etiqueta: "Pedidos", roles: [Rol.MESERO, Rol.CAJERO, Rol.ADMINISTRADOR] },
  { href: "/cocina", etiqueta: "Cocina", roles: [Rol.COCINA] },
  { href: "/caja", etiqueta: "Caja", roles: [Rol.CAJERO] },
  {
    href: "/reportes",
    etiqueta: "Reportes",
    roles: [Rol.MESERO, Rol.ADMINISTRADOR],
  },
  { href: "/menu", etiqueta: "Menú", roles: [Rol.ADMINISTRADOR] },
  { href: "/usuarios", etiqueta: "Usuarios", roles: [Rol.ADMINISTRADOR] },
  { href: "/chat", etiqueta: "Chat", roles: TODOS },
];

export function navegacionPara(rol: Rol): ElementoNavegacion[] {
  return NAVEGACION.filter((elemento) => elemento.roles.includes(rol));
}

/** Nombre de cada rol para mostrar. */
export const ETIQUETA_ROL: Record<Rol, string> = {
  MESERO: "Mesero",
  COCINA: "Cocina",
  CAJERO: "Caja",
  ADMINISTRADOR: "Administrador",
};

/**
 * Texto y símbolo de cada estado del pedido. El estado nunca se comunica solo
 * con color (WCAG 1.4.1): siempre lleva texto y un símbolo.
 */
export const ETIQUETA_ESTADO: Record<EstadoPedido, { texto: string; simbolo: string }> = {
  [EstadoPedido.CREADO]: { texto: "Creado", simbolo: "○" },
  [EstadoPedido.EN_PREPARACION]: { texto: "En preparación", simbolo: "◐" },
  [EstadoPedido.LISTO]: { texto: "Listo", simbolo: "●" },
  [EstadoPedido.ENTREGADO]: { texto: "Entregado", simbolo: "✓" },
  [EstadoPedido.COBRADO]: { texto: "Cobrado", simbolo: "$" },
  [EstadoPedido.CANCELADO]: { texto: "Cancelado", simbolo: "✕" },
};
