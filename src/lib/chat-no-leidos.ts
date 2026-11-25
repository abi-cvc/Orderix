/**
 * Lógica pura para el conteo y visualización accesible de mensajes no leídos del chat.
 */

export function esRutaChat(ruta: string): boolean {
  return ruta === "/chat" || ruta.startsWith("/chat/");
}

export function debeContarMensaje(
  mensaje: { autorId: number },
  usuarioActualId: number,
  rutaActual: string,
): boolean {
  // Ignora mensajes propios
  if (mensaje.autorId === usuarioActualId) return false;
  // No cuenta si el usuario ya está dentro de la pantalla de chat
  if (esRutaChat(rutaActual)) return false;
  return true;
}

export function calcularNoLeidosAlRecibir(
  noLeidosActual: number,
  mensaje: { autorId: number },
  usuarioActualId: number,
  rutaActual: string,
): number {
  if (!debeContarMensaje(mensaje, usuarioActualId, rutaActual)) {
    return noLeidosActual;
  }
  return noLeidosActual + 1;
}

export function formatearInsigniaNoLeidos(cantidad: number): string {
  if (cantidad <= 0) return "";
  if (cantidad > 99) return "99+";
  return String(cantidad);
}

export function formatearAriaLabelChat(cantidad: number, etiquetaBase = "Chat"): string {
  if (cantidad <= 0) return etiquetaBase;
  if (cantidad === 1) return `${etiquetaBase}, 1 mensaje sin leer`;
  return `${etiquetaBase}, ${cantidad} mensajes sin leer`;
}
