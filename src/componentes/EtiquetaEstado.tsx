import type { EstadoPedido } from "@/generated/prisma/enums";
import { ETIQUETA_ESTADO } from "@/lib/navegacion";

/** Estado de un pedido con texto, símbolo y color (nunca solo color). */
export function EtiquetaEstado({ estado }: { estado: EstadoPedido }) {
  const { texto, simbolo } = ETIQUETA_ESTADO[estado];
  return (
    <span className={`estado estado--${estado}`}>
      <span aria-hidden="true">{simbolo}</span>
      {texto}
    </span>
  );
}
