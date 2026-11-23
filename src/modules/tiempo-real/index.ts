/**
 * API pública del módulo tiempo-real.
 *
 * Frente D (Roberth): aquí se agregan el chat (salas, mensajes, historial) y la
 * lista de conectados, con su repositorio, servicio y validadores.
 * Tablas propias: salas, mensajes.
 */
export { configurarConexiones, usuarioDeConexion } from "./conexion";
export { desconectarUsuario } from "./publicador";
export type { EventosTiempoReal, TipoEvento } from "./eventos";
export { publicarEvento, registrarServidorSocket } from "./publicador";
export { enviarMensaje, obtenerHistorial } from "./servicio";
export type { MensajeGuardado, SalaGuardada } from "./repositorio";
export { conectados, crearAlmacenConectados, type UsuarioConectado } from "./conectados";
export { notificarEscribiendo, formatearTextoEscribiendo } from "./escribiendo";
