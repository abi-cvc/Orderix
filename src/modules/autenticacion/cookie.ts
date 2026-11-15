/**
 * Nombre y opciones de la cookie de sesión. Archivo sin dependencias de Next
 * para que también lo use el handshake del WebSocket (paso 6).
 */
import { env } from "@/lib/env";

/**
 * Secure depende de que la aplicación se sirva por HTTPS (APP_URL), no de
 * NODE_ENV: la demo local en modo producción corre por http y el navegador
 * descartaría una cookie Secure. En Render APP_URL es https.
 */
function conHttps(): boolean {
  return new URL(env().APP_URL).protocol === "https:";
}

/**
 * Con HTTPS lleva el prefijo __Host-: el navegador solo la acepta con Secure,
 * sin Domain y con Path=/, así ningún subdominio puede pisarla.
 */
export function nombreCookieSesion(): string {
  return conHttps() ? "__Host-orderix_sesion" : "orderix_sesion";
}

export function opcionesCookieSesion(maxAgeSegundos: number) {
  return {
    httpOnly: true, // JavaScript del navegador no puede leerla (XSS)
    secure: conHttps(), // solo viaja por HTTPS
    sameSite: "lax" as const, // no viaja en POST desde otros sitios (CSRF)
    path: "/",
    maxAge: maxAgeSegundos,
  };
}

/** Lee el token de la cookie de sesión desde una cabecera Cookie cruda. */
export function tokenDesdeCabeceraCookie(cabecera: string | undefined): string | undefined {
  if (!cabecera) return undefined;
  const nombre = nombreCookieSesion();
  for (const parte of cabecera.split(";")) {
    const [clave, ...valor] = parte.trim().split("=");
    if (clave === nombre) return decodeURIComponent(valor.join("="));
  }
  return undefined;
}
