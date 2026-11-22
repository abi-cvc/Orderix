"use server";

import { z } from "@/lib/zod";
import { estadoDeError, type EstadoFormulario } from "@/lib/formularios";
import { validar } from "@/lib/validacion";
import { protegerFormulario, requireRole } from "@/modules/autenticacion";

/** En un módulo real este esquema vive en validadores.ts y lo comparte el formulario. */
const esquemaEjemplo = z.object({
  nombre: z.string().trim().min(3, "Escribe al menos 3 caracteres."),
  mesa: z.coerce
    .number({ error: "Escribe un número de mesa." })
    .int("La mesa es un número entero.")
    .min(1, "La mesa va de 1 a 50.")
    .max(50, "La mesa va de 1 a 50."),
});

/**
 * Patrón de toda acción de servidor que cambia datos:
 * 1. protegerFormulario (origen + CSRF)  2. requireRole  3. el servicio valida y guarda.
 */
export async function enviarEjemplo(
  _estadoAnterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(datos);
    await requireRole();
    const valores = validar(esquemaEjemplo, Object.fromEntries(datos));
    return { exito: true, mensaje: `Datos válidos: ${valores.nombre}, mesa ${valores.mesa}.` };
  } catch (error) {
    return estadoDeError(error);
  }
}
