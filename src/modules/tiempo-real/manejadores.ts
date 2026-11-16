/**
 * Manejadores de los eventos que ENVÍA el navegador (chat, conectados...).
 *
 * Frente D (Roberth): aquí se registran. Cuando se llama a esta función la
 * conexión ya está autenticada, unida a sus salas y con límite de frecuencia.
 *
 * Reglas para cada manejador:
 * - El autor es SIEMPRE `usuario` (de la sesión), nunca un dato que mande el cliente.
 * - La entrada llega como `unknown` y la valida el servicio (Zod).
 * - Responder con el callback (ack) y atrapar los errores: un error sin atrapar
 *   no debe tumbar la conexión ni mostrar detalles internos.
 *
 * Ejemplo:
 *   socket.on("chat:enviar", async (entrada: unknown, responder?: (r: unknown) => void) => {
 *     try {
 *       const mensaje = await enviarMensaje(usuario, entrada);
 *       io.to(SALA_CHAT_GENERAL).emit("chat:mensaje", mensaje);
 *       responder?.({ ok: true });
 *     } catch (error) {
 *       responder?.({ ok: false, error: mensajeParaUsuario(error) });
 *     }
 *   });
 */
import type { Server, Socket } from "socket.io";
import type { UsuarioSesion } from "@/modules/autenticacion";

export function registrarManejadores(io: Server, socket: Socket, usuario: UsuarioSesion): void {
  void io;
  void socket;
  void usuario;
}
