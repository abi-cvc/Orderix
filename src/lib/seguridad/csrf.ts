/**
 * Token CSRF firmado: HMAC-SHA256(SESSION_SECRET, id de la sesión).
 *
 * No hace falta guardarlo en la base: el servidor lo recalcula y compara.
 * Un sitio ajeno no puede generarlo porque no conoce el secreto ni la sesión.
 * Las funciones que leen la cookie están en el módulo autenticacion.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export { CAMPO_CSRF } from "./constantes";

export function firmarCsrf(idSesion: string): string {
  return createHmac("sha256", env().SESSION_SECRET).update(`csrf:${idSesion}`).digest("base64url");
}

/** Compara en tiempo constante el token recibido con el esperado. */
export function csrfValido(idSesion: string, token: unknown): boolean {
  if (typeof token !== "string") return false;
  const esperado = Buffer.from(firmarCsrf(idSesion));
  const recibido = Buffer.from(token);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}
