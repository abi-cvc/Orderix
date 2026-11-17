import { ErrorDominio, ErrorValidacion } from "@/lib/errores";

/**
 * Estado que devuelve una acción de servidor a su formulario (useActionState).
 * - `errores`: mensajes por campo, para <Campo errores={estado.errores?.nombre} />.
 * - `mensaje` + `exito`: aviso general para <Anuncio />.
 */
export interface EstadoFormulario {
  exito?: boolean;
  mensaje?: string;
  errores?: Record<string, string[]>;
}

/**
 * Convierte un error de un servicio en el estado del formulario. Los errores de
 * dominio tienen mensajes aptos para el usuario; cualquier otro se registra en
 * el servidor y se muestra un mensaje genérico (sin detalles internos).
 */
export function estadoDeError(error: unknown): EstadoFormulario {
  if (error instanceof ErrorValidacion) {
    return { exito: false, mensaje: error.message, errores: error.campos };
  }
  if (error instanceof ErrorDominio) {
    return { exito: false, mensaje: error.message };
  }
  console.error("Error inesperado en una acción", error);
  return { exito: false, mensaje: "Ocurrió un error inesperado. Intenta de nuevo." };
}
