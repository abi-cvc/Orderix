/**
 * Lógica para la notificación y visualización de usuarios escribiendo en el chat.
 */
import type { UsuarioSesion } from "@/modules/autenticacion";

export interface EmisorEscribiendo {
  broadcast: {
    emit(evento: "chat:escribiendo", datos: { usuarioId: number; nombre: string }): void;
  };
}

/**
 * Reenvía la notificación a los demás miembros conectados (nunca a quien escribe).
 * El id y nombre se toman exclusivamente de la sesión, ignorando cualquier payload del cliente.
 */
export function notificarEscribiendo(
  emisor: EmisorEscribiendo,
  usuario: UsuarioSesion,
): { usuarioId: number; nombre: string } {
  const datos = {
    usuarioId: usuario.id,
    nombre: usuario.nombre,
  };
  emisor.broadcast.emit("chat:escribiendo", datos);
  return datos;
}
