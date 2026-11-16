import type { EstadoPedido } from "@/generated/prisma/enums";

/**
 * Texto del botón que lleva un pedido a cada estado, su estilo y, si es una
 * acción que no se puede deshacer, la confirmación que pide.
 */
export function accionHacia(
  estado: EstadoPedido,
  pedido: { id: number; numeroMesa: number; total: string },
  totalTexto: string,
): {
  texto: string;
  variante: "primario" | "secundario" | "peligro";
  confirmar?: { titulo: string; descripcion: string; textoConfirmar: string };
} {
  switch (estado) {
    case "EN_PREPARACION":
      return { texto: "Empezar preparación", variante: "primario" };
    case "LISTO":
      return { texto: "Marcar como listo", variante: "primario" };
    case "ENTREGADO":
      return { texto: "Marcar como entregado", variante: "primario" };
    case "COBRADO":
      return {
        texto: `Cobrar ${totalTexto}`,
        variante: "primario",
        confirmar: {
          titulo: `¿Cobrar el pedido ${pedido.id}?`,
          descripcion: `Mesa ${pedido.numeroMesa}. Total a cobrar: ${totalTexto}. El pedido quedará cerrado.`,
          textoConfirmar: `Sí, cobrar ${totalTexto}`,
        },
      };
    case "CANCELADO":
      return {
        texto: "Cancelar pedido",
        variante: "peligro",
        confirmar: {
          titulo: `¿Cancelar el pedido ${pedido.id}?`,
          descripcion: `Mesa ${pedido.numeroMesa}. El pedido quedará cancelado con su historial y no podrá avanzar.`,
          textoConfirmar: "Sí, cancelar pedido",
        },
      };
    default:
      return { texto: estado, variante: "secundario" };
  }
}
