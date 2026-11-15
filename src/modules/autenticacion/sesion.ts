/**
 * CONTRATO: sesiones y protección de rutas y acciones.
 *
 * `requireRole` es el ÚNICO lugar que decide quién está autenticado. Cuando en
 * el segundo bimestre se pase de sesiones a JWT, solo cambia este archivo.
 *
 * Cómo funciona la sesión:
 * - La cookie lleva un token aleatorio de 32 bytes (httpOnly, Secure, SameSite).
 * - En la tabla `sesiones` se guarda SOLO su SHA-256: si la base se filtra, no
 *   sirve para suplantar a nadie.
 * - Cada inicio de sesión crea un id nuevo (evita la fijación de sesión) y
 *   cerrar sesión lo borra en el servidor, no solo en el navegador.
 */
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Rol } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { ErrorNoAutenticado, ErrorProhibido } from "@/lib/errores";
import { generarToken, hashearToken } from "@/lib/hash";
import { CAMPO_CSRF, csrfValido, firmarCsrf } from "@/lib/seguridad/csrf";
import { origenPermitido } from "@/lib/seguridad/peticion";
import { nombreCookieSesion, opcionesCookieSesion } from "./cookie";
import * as repositorio from "./repositorio";
import type { UsuarioSesion } from "./tipos";

/**
 * Crea la sesión del usuario y pone la cookie. Se llama SOLO desde una acción
 * de servidor o ruta, justo después de verificar las credenciales.
 */
export async function iniciarSesion(usuarioId: number): Promise<void> {
  const horas = env().SESSION_TTL_HOURS;
  const token = generarToken();

  // Si ya había una sesión en este navegador, se descarta (id nuevo en cada login).
  await cerrarSesion();
  await repositorio.crearSesion({
    id: hashearToken(token),
    usuarioId,
    expiraEn: new Date(Date.now() + horas * 3_600_000),
  });

  const almacen = await cookies();
  almacen.set(nombreCookieSesion(), token, opcionesCookieSesion(horas * 3600));
}

/** Cierra la sesión actual: la borra de la base y del navegador. */
export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  const token = almacen.get(nombreCookieSesion())?.value;
  if (token) await repositorio.borrarSesion(hashearToken(token));
  almacen.delete(nombreCookieSesion());
}

/** Cierra todas las sesiones de un usuario (al restablecer la clave o desactivarlo). */
export function cerrarTodasLasSesiones(usuarioId: number): Promise<void> {
  return repositorio.borrarSesionesDeUsuario(usuarioId);
}

/**
 * Usuario dueño de un token de sesión, o null si no existe, venció o el
 * usuario está desactivado. Lo usa también el handshake del WebSocket.
 */
export async function usuarioDesdeToken(token: string | undefined): Promise<UsuarioSesion | null> {
  if (!token) return null;
  const id = hashearToken(token);
  const sesion = await repositorio.buscarSesionConUsuario(id);
  if (!sesion) return null;

  if (sesion.expiraEn <= new Date()) {
    await repositorio.borrarSesion(id);
    return null;
  }
  if (!sesion.usuario.activo) return null;

  const { id: usuarioId, nombre, rol } = sesion.usuario;
  return { id: usuarioId, nombre, rol };
}

async function tokenDeLaPeticion(): Promise<string | undefined> {
  return (await cookies()).get(nombreCookieSesion())?.value;
}

/**
 * Usuario de la sesión actual, o null si no hay sesión.
 *
 * Orden: 1) cookie de sesión; 2) solo en desarrollo, el usuario falso de
 * DEV_FAKE_USER_ROLE (env() impide activarlo en producción).
 * `cache` evita consultar la base más de una vez por petición.
 */
export const obtenerUsuarioSesion = cache(async (): Promise<UsuarioSesion | null> => {
  const usuario = await usuarioDesdeToken(await tokenDeLaPeticion());
  if (usuario) return usuario;

  const rolFalso = env().DEV_FAKE_USER_ROLE;
  if (rolFalso) return repositorio.buscarPrimerUsuarioActivoPorRol(rolFalso);
  return null;
});

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

// ------------------------------------------------------------------- CSRF

/**
 * Token CSRF para el campo oculto de un formulario que cambia datos:
 *   <input type="hidden" name={CAMPO_CSRF} value={await tokenCsrf()} />
 * Devuelve "" si no hay sesión (login, registro y recuperación no lo necesitan).
 */
export async function tokenCsrf(): Promise<string> {
  const token = await tokenDeLaPeticion();
  return token ? firmarCsrf(hashearToken(token)) : "";
}

/**
 * Primera línea de toda acción de servidor o ruta POST que cambia datos:
 * comprueba que la petición venga de nuestro sitio y, si hay sesión, que traiga
 * el token CSRF correcto.
 *
 * @throws ErrorProhibido si el origen o el token no son válidos.
 */
export async function protegerFormulario(datos?: FormData): Promise<void> {
  if (!origenPermitido(await headers())) {
    throw new ErrorProhibido("Solicitud rechazada: origen no permitido.");
  }
  const token = await tokenDeLaPeticion();
  if (token && !csrfValido(hashearToken(token), datos?.get(CAMPO_CSRF))) {
    throw new ErrorProhibido("Solicitud rechazada: el formulario expiró, recarga la página.");
  }
}
