import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

/**
 * Parámetros de Argon2id recomendados por OWASP (19 MiB, 2 iteraciones).
 * La sal es aleatoria por clave y queda dentro del mismo texto del hash.
 */
const OPCIONES_ARGON2 = {
  // Algorithm.Argon2id. Se escribe el valor porque la librería lo declara como
  // `const enum`, que no se puede importar con isolatedModules.
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Devuelve el hash Argon2id de una contraseña (formato PHC: $argon2id$...). */
export function hashearClave(clave: string): Promise<string> {
  return hash(clave, OPCIONES_ARGON2);
}

/** Compara una contraseña con su hash en tiempo constante. Nunca lanza por clave incorrecta. */
export async function verificarClave(hashGuardado: string, clave: string): Promise<boolean> {
  try {
    return await verify(hashGuardado, clave);
  } catch {
    return false;
  }
}

/** Token aleatorio seguro para cookies de sesión y enlaces de recuperación. */
export function generarToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * SHA-256 de un token. En la base se guarda esto, nunca el token.
 * (Para tokens aleatorios largos basta SHA-256; Argon2 es para contraseñas.)
 */
export function hashearToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
