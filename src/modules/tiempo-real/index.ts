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
