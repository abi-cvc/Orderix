/**
 * CONTRATO: protección de rutas y acciones.
 *
 * `requireRole` es el ÚNICO lugar que decide quién está autenticado. Cuando en
 * el segundo bimestre se pase de sesiones a JWT, solo cambia este archivo.
 */
import type { Rol } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { ErrorNoAutenticado, ErrorProhibido } from "@/lib/errores";
import { buscarPrimerUsuarioActivoPorRol } from "./repositorio";
import type { UsuarioSesion } from "./tipos";

/**
 * Usuario de la sesión actual, o null si no hay sesión.
 *
 * Estado actual (esqueleto): solo existe el usuario falso de desarrollo,
 * activado con DEV_FAKE_USER_ROLE. env() impide activarlo en producción.
 * El paso 5 agrega la lectura de la cookie de sesión.
 */
export async function obtenerUsuarioSesion(): Promise<UsuarioSesion | null> {
  const rolFalso = env().DEV_FAKE_USER_ROLE;
  if (rolFalso) {
    return buscarPrimerUsuarioActivoPorRol(rolFalso);
  }
  return null;
}

/**
 * Exige sesión y, si se pasan roles, que el usuario tenga uno de ellos.
 *
 * @example
 *   const usuario = await requireRole("COCINA");             // solo cocina
 *   const usuario = await requireRole("CAJERO", "ADMINISTRADOR");
 *   const usuario = await requireRole();                     // cualquier rol con sesión
 *
 * @throws ErrorNoAutenticado si no hay sesión.
 * @throws ErrorProhibido si el rol no está permitido.
 */
export async function requireRole(...roles: Rol[]): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuarioSesion();
  if (!usuario) throw new ErrorNoAutenticado();
  if (roles.length > 0 && !roles.includes(usuario.rol)) throw new ErrorProhibido();
  return usuario;
}
