/**
 * Servicio de tiempo-real: lógica de negocio para el chat y salas.
 *
 * Sigue el patrón de calificaciones/servicio.ts:
 * 1. Recibe el usuario de la sesión y la entrada como unknown.
 * 2. Valida la entrada SIEMPRE en el servidor con los esquemas Zod.
 * 3. Aplica reglas de negocio y lanza errores de dominio (@/lib/errores).
 * 4. Las dependencias del repositorio se inyectan para permitir pruebas con mocks.
 */
import { ErrorNoEncontrado } from "@/lib/errores";
import { validar } from "@/lib/validacion";
import type { UsuarioSesion } from "@/modules/autenticacion";
import * as repositorio from "./repositorio";
import { esquemaEnviarMensaje, esquemaNombreSala } from "./validadores";

export interface DependenciasTiempoReal {
  repositorio: Pick<
    typeof repositorio,
    "buscarSalaPorNombre" | "guardarMensaje" | "obtenerHistorialDeSala"
  >;
}

const dependenciasReales: DependenciasTiempoReal = { repositorio };

/**
 * Envía un mensaje al chat.
 * Cualquier usuario autenticado puede enviar mensajes (no se filtra por rol).
 * autorId y autorNombre se obtienen exclusivamente de la sesión (UsuarioSesion).
 */
export async function enviarMensaje(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasTiempoReal = dependenciasReales,
): Promise<repositorio.MensajeGuardado> {
  const datos = validar(esquemaEnviarMensaje, entrada);

  const sala = await deps.repositorio.buscarSalaPorNombre(datos.sala);
  if (!sala) {
    throw new ErrorNoEncontrado("La sala no existe.");
  }

  return deps.repositorio.guardarMensaje({
    salaId: sala.id,
    autorId: usuario.id,
    autorNombre: usuario.nombre,
    texto: datos.texto,
  });
}

/**
 * Obtiene el historial de los últimos mensajes de una sala en orden cronológico.
 * Disponible para cualquier usuario con sesión, sin filtrar por rol.
 */
export async function obtenerHistorial(
  usuario: UsuarioSesion,
  sala: unknown,
  deps: DependenciasTiempoReal = dependenciasReales,
): Promise<repositorio.MensajeGuardado[]> {
  void usuario;

  const nombreSala = validar(esquemaNombreSala, sala);

  const salaExistente = await deps.repositorio.buscarSalaPorNombre(nombreSala);
  if (!salaExistente) {
    throw new ErrorNoEncontrado("La sala no existe.");
  }

  return deps.repositorio.obtenerHistorialDeSala(salaExistente.id);
}
