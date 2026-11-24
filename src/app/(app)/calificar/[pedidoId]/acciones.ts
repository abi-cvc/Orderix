"use server";

import { revalidatePath } from "next/cache";
import { Rol } from "@/generated/prisma/enums";
import { estadoDeError, type EstadoFormulario } from "@/lib/formularios";
import { calificarPedido } from "@/modules/calificaciones";
import { protegerFormulario, requireRole } from "@/modules/autenticacion";

export async function registrarCalificacionAccion(
  pedidoId: number,
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(datos);
    const usuario = await requireRole(Rol.CAJERO);
    await calificarPedido(usuario, { pedidoId, puntaje: datos.get("puntaje") });
    revalidatePath(`/pedidos/${pedidoId}`);
    return { exito: true, mensaje: "Calificación registrada." };
  } catch (error) {
    return estadoDeError(error);
  }
}
