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
import { cache } from "react";
import type { Rol } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { ErrorNoAutenticado, ErrorProhibido } from "@/lib/errores";
import { generarToken, hashearToken } from "@/lib/hash";
import { CAMPO_CSRF, csrfValido, firmarCsrf } from "@/lib/seguridad/csrf";
import { origenPermitido } from "@/lib/seguridad/peticion";
import { nombreCookieSesion, opcionesCookieSesion, tokenDesdeCabeceraCookie } from "./cookie";
import * as repositorio from "./repositorio";
import type { UsuarioSesion } from "./tipos";

// next/headers se carga recién al usarse (siempre dentro de Next). Si se
// importara arriba, server.ts lo cargaría al arrancar (vía el handshake del
// WebSocket) antes de que Next prepare su entorno, y Next se caería.
async function cookies() {
  return (await import("next/headers")).cookies();
}
async function headers() {
  return (await import("next/headers")).headers();
}

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
  // Se vacía con las MISMAS opciones con que se creó (Secure, Path=/...): el
  // navegador no deja borrar una cookie __Host- si la orden no trae Secure.
  // cookies().delete() no las repite, así que la cookie quedaba en el navegador.
  almacen.set(nombreCookieSesion(), "", opcionesCookieSesion(0));
}

/** Cierra todas las sesiones de un usuario (al restablecer la clave o desactivarlo). */
export function cerrarTodasLasSesiones(usuarioId: number): Promise<void> {
  return repositorio.borrarSesionesDeUsuario(usuarioId);
}

interface SesionValida {
  usuario: UsuarioSesion;
  expiraEn: Date;
}

/**
 * Sesión de un token, o null si no existe, venció o el usuario está desactivado.
 */
async function sesionDesdeToken(token: string | undefined): Promise<SesionValida | null> {
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
  return { usuario: { id: usuarioId, nombre, rol }, expiraEn: sesion.expiraEn };
}

/** Usuario falso de desarrollo (DEV_FAKE_USER_ROLE), o null si está desactivado. */
async function usuarioFalsoDeDesarrollo(): Promise<UsuarioSesion | null> {
  const rolFalso = env().DEV_FAKE_USER_ROLE;
  return rolFalso ? repositorio.buscarPrimerUsuarioActivoPorRol(rolFalso) : null;
}

/**
 * Autentica una conexión WebSocket a partir de la cabecera Cookie del
 * handshake (fuera de Next no existe `cookies()`). Mismas reglas que las
 * páginas: cookie de sesión y, solo en desarrollo, el usuario falso.
 * Devuelve también cuándo vence, para cortar la conexión a tiempo.
 */
export async function autenticarConexion(
  cabeceraCookie: string | undefined,
): Promise<SesionValida | null> {
  const sesion = await sesionDesdeToken(tokenDesdeCabeceraCookie(cabeceraCookie));
  if (sesion) return sesion;

  const usuario = await usuarioFalsoDeDesarrollo();
  if (!usuario) return null;
  return { usuario, expiraEn: new Date(Date.now() + env().SESSION_TTL_HOURS * 3_600_000) };
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
  const sesion = await sesionDesdeToken(await tokenDeLaPeticion());
  return sesion?.usuario ?? usuarioFalsoDeDesarrollo();
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
