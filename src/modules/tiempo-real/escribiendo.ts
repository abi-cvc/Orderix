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

/**
 * Formatea el texto visible y anunciado para lectores de pantalla.
 * - 1 persona: "Ana está escribiendo…"
 * - 2 personas: "Ana y Luis están escribiendo…"
 * - 3 o más: "Varias personas están escribiendo…"
 */
export function formatearTextoEscribiendo(nombres: string[]): string {
  if (nombres.length === 0) return "";
  if (nombres.length === 1) return `${nombres[0]} está escribiendo…`;
  if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]} están escribiendo…`;
  return "Varias personas están escribiendo…";
}
