/**
 * API pública del módulo autenticacion. Los demás módulos y las páginas
 * importan SOLO desde "@/modules/autenticacion", nunca archivos internos.
 */
export type { UsuarioSesion } from "./tipos";
export { obtenerUsuarioSesion, requireRole } from "./sesion";
