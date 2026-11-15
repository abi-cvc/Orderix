/**
 * API pública del módulo autenticacion. Los demás módulos y las páginas
 * importan SOLO desde "@/modules/autenticacion", nunca archivos internos.
 */
export type { UsuarioSesion } from "./tipos";
export {
  cerrarSesion,
  cerrarTodasLasSesiones,
  iniciarSesion,
  obtenerUsuarioSesion,
  protegerFormulario,
  requireRole,
  tokenCsrf,
  usuarioDesdeToken,
} from "./sesion";
export { tokenDesdeCabeceraCookie } from "./cookie";
export { CAMPO_CSRF } from "@/lib/seguridad/csrf";
