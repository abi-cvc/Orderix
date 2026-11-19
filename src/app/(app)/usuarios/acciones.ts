"use server";

import { revalidatePath } from "next/cache";
import { estadoDeError, type EstadoFormulario } from "@/lib/formularios";
import {
  cambiarActivo,
  cambiarRol,
  protegerFormulario,
  requireRole,
} from "@/modules/autenticacion";

async function ejecutar(
  datos: FormData,
  operacion: () => Promise<void>,
  mensaje: string,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(datos);
    await operacion();
    revalidatePath("/usuarios");
    return { exito: true, mensaje };
  } catch (error) {
    return estadoDeError(error);
  }
}

export async function cambiarRolAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  return ejecutar(
    datos,
    async () => cambiarRol(await requireRole(), Object.fromEntries(datos)),
    "Rol actualizado. La persona debe volver a iniciar sesión.",
  );
}

export async function cambiarActivoAccion(
  _estado: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  return ejecutar(
    datos,
    async () => cambiarActivo(await requireRole(), Object.fromEntries(datos)),
    "Estado de la cuenta actualizado.",
  );
}
