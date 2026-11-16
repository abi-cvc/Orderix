"use client";

/**
 * Conexión WebSocket del navegador. Una sola por pestaña, compartida por todas
 * las pantallas (chat, cocina, avisos del mesero).
 *
 * La cookie de sesión viaja sola (mismo sitio): no hay que mandar tokens a mano.
 * Si no hay sesión, el servidor rechaza la conexión y se recibe "connect_error".
 *
 * @example
 *   useEffect(() => {
 *     const socket = obtenerSocket();
 *     const alCrear = (datos: EventosTiempoReal["pedido.creado"]) => { ... };
 *     socket.on("pedido.creado", alCrear);
 *     return () => { socket.off("pedido.creado", alCrear); };
 *   }, []);
 */
import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;

export function obtenerSocket(): Socket {
  socket ??= io({ path: "/socket.io", withCredentials: true });
  return socket;
}
