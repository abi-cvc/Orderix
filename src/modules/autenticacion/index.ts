/**
 * API pública del módulo autenticacion. Los demás módulos y las páginas
 * importan SOLO desde "@/modules/autenticacion", nunca archivos internos.
 */
export type { UsuarioSesion } from "./tipos";
export {
  registrarUsuario,
  verificarCredenciales,
  solicitarRecuperacion,
  restablecerClave,
} from "./servicio";
export {
  autenticarConexion,
  cerrarSesion,
  cerrarTodasLasSesiones,
  iniciarSesion,
  obtenerUsuarioSesion,
  protegerFormulario,
  requireRole,
  tokenCsrf,
} from "./sesion";
export {
  cambiarActivo,
  cambiarRol,
  listarUsuarios,
  type UsuarioListado,
} from "./servicio-usuarios";
export { obtenerNombresDeUsuarios } from "./contratos";
export { CAMPO_CSRF } from "@/lib/seguridad/csrf";
