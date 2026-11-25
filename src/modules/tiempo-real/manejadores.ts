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
 */
import type { Server, Socket } from "socket.io";
import { ErrorDominio } from "@/lib/errores";
import type { UsuarioSesion } from "@/modules/autenticacion";
import { conectados } from "./conectados";
import { notificarEscribiendo } from "./escribiendo";
import { enviarMensaje, obtenerHistorial } from "./servicio";

export function registrarManejadores(io: Server, socket: Socket, usuario: UsuarioSesion): void {
  // Registrar el socket del usuario en memoria
  conectados.conectar({ id: usuario.id, nombre: usuario.nombre }, socket.id);

  // Enviar la lista actual a la nueva conexión y emitir a todos al conectar
  socket.emit("chat:conectados", conectados.listar());
  io.emit("chat:conectados", conectados.listar());

  // Al desconectar este socket, actualizar y emitir a todos
  socket.on("disconnect", () => {
    conectados.desconectar(socket.id);
    io.emit("chat:conectados", conectados.listar());
  });

  /**
   * Envío de mensaje al chat:
   * 1. Toma el usuario de la sesión de la conexión.
   * 2. Llama a enviarMensaje(usuario, entrada).
   * 3. Reenvía el mensaje guardado a todos con "chat:mensaje".
   * 4. Responde con ack (éxito o mensaje claro de error sin datos internos).
   */
  socket.on("chat:enviar", async (entrada: unknown, responder?: (r: unknown) => void) => {
    try {
      const mensaje = await enviarMensaje(usuario, entrada);
      io.emit("chat:mensaje", mensaje);
      responder?.({ ok: true, mensaje });
    } catch (error) {
      const mensajeError =
        error instanceof ErrorDominio ? error.message : "Ocurrió un error al enviar el mensaje.";
      responder?.({ ok: false, error: mensajeError });
    }
  });

  /**
   * Solicitud de historial de mensajes:
   * Responde SOLO a quien lo pidió y refresca la lista de conectados.
   */
  socket.on("chat:historial", async (sala: unknown, responder?: (r: unknown) => void) => {
    try {
      socket.emit("chat:conectados", conectados.listar());
      const mensajes = await obtenerHistorial(usuario, sala);
      socket.emit("chat:historial", mensajes);
      responder?.({ ok: true, mensajes });
    } catch (error) {
      const mensajeError =
        error instanceof ErrorDominio ? error.message : "Ocurrió un error al obtener el historial.";
      responder?.({ ok: false, error: mensajeError });
    }
  });

  /**
   * Solicitud explícita de lista de conectados:
   * Permite que pantallas montadas después de la conexión obtengan la lista de inmediato.
   */
  socket.on("chat:conectados", (responder?: (r: unknown) => void) => {
    const lista = conectados.listar();
    socket.emit("chat:conectados", lista);
    responder?.({ ok: true, conectados: lista });
  });

  /**
   * Evento de usuario escribiendo:
   * Reenvía a los demás con datos tomados de la sesión (nunca del cliente).
   */
  socket.on("chat:escribiendo", () => {
    notificarEscribiendo(socket, usuario);
  });
}
