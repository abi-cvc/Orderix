"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { estadoDeError, type EstadoFormulario } from "@/lib/formularios";
import { protegerFormulario, requireRole } from "@/modules/autenticacion";
import {
  crearProducto,
  desactivarProducto,
  editarProducto,
  eliminarProducto,
} from "@/modules/menu";

function refrescar(): void {
  revalidatePath("/menu");
  revalidatePath("/pedidos");
  revalidatePath("/pedidos/nuevo");
}

async function ejecutar(
  datos: FormData,
  operacion: () => Promise<void>,
  mensaje: string,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(datos);
    await operacion();
    refrescar();
    return { exito: true, mensaje };
  } catch (error) {
    return estadoDeError(error);
  }
}

export async function crearProductoAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  let productoId: number;
  try {
    await protegerFormulario(datos);
    const producto = await crearProducto(await requireRole(), Object.fromEntries(datos));
    productoId = producto.id;
    refrescar();
  } catch (error) {
    return estadoDeError(error);
  }
  redirect(`/menu/${productoId}`);
}

export async function editarProductoAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  return ejecutar(
    datos,
    async () => {
      await editarProducto(await requireRole(), Object.fromEntries(datos));
    },
    "Producto actualizado.",
  );
}

export async function desactivarProductoAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  return ejecutar(
    datos,
    async () => {
      await desactivarProducto(await requireRole(), datos.get("id"));
    },
    "Producto desactivado.",
  );
}

export async function eliminarProductoAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  return ejecutar(
    datos,
    async () => {
      await eliminarProducto(await requireRole(), datos.get("id"));
    },
    "Producto eliminado.",
  );
}
