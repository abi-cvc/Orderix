"use server";

/**
 * Acciones de servidor de pedidos, cocina y caja. Todas siguen el mismo patrón:
 * 1. protegerFormulario (origen + CSRF)  2. requireRole (sesión)
 * 3. el servicio valida, revisa permisos y guarda  4. se refrescan las pantallas.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { estadoDeError, type EstadoFormulario } from "@/lib/formularios";
import { protegerFormulario, requireRole } from "@/modules/autenticacion";
import {
  agregarItems,
  cambiarEstado,
  crearPedido,
  editarItem,
  quitarItem,
} from "@/modules/pedidos";

function refrescar(): void {
  revalidatePath("/pedidos", "layout");
  revalidatePath("/cocina");
  revalidatePath("/caja");
}

/** Ejecuta la operación con las protecciones comunes y traduce los errores. */
async function ejecutar(
  datos: FormData,
  operacion: () => Promise<void>,
  mensajeExito: string,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(datos);
    await operacion();
    refrescar();
    return { exito: true, mensaje: mensajeExito };
  } catch (error) {
    return estadoDeError(error);
  }
}

export async function crearPedidoAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  let pedidoId: number;
  try {
    await protegerFormulario(datos);
    const pedido = await crearPedido(await requireRole(), Object.fromEntries(datos));
    pedidoId = pedido.id;
    refrescar();
  } catch (error) {
    return estadoDeError(error);
  }
  // redirect lanza una excepción especial: va fuera del try.
  redirect(`/pedidos/${pedidoId}?creado=1`);
}

export async function cambiarEstadoAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  return ejecutar(
    datos,
    async () => cambiarEstado(await requireRole(), Object.fromEntries(datos)),
    "Estado actualizado.",
  );
}

export async function agregarItemAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const { pedidoId, productoId, cantidad, alergias, notas } = Object.fromEntries(datos);
  return ejecutar(
    datos,
    async () =>
      agregarItems(await requireRole(), {
        pedidoId,
        items: [{ productoId, cantidad, alergias, notas }],
      }),
    "Producto agregado al pedido.",
  );
}

export async function editarItemAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  return ejecutar(
    datos,
    async () => editarItem(await requireRole(), Object.fromEntries(datos)),
    "Producto actualizado.",
  );
}

export async function quitarItemAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  return ejecutar(
    datos,
    async () => quitarItem(await requireRole(), Object.fromEntries(datos)),
    "Producto quitado del pedido.",
  );
}
