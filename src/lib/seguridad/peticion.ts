/**
 * Datos confiables de la petición: IP del cliente y verificación de origen.
 *
 * La IP la calcula server.ts (que sí ve el socket) y la deja en una cabecera
 * interna que siempre sobrescribe, así el navegador no puede falsificarla.
 */
import type { IncomingMessage } from "node:http";
import { env } from "@/lib/env";

/** Cabecera interna con la IP real del cliente. Nunca se confía en la que mande el navegador. */
export const CABECERA_IP_CLIENTE = "x-orderix-ip";

interface CabecerasLeibles {
  get(nombre: string): string | null;
}

/**
 * IP del cliente según el socket o, si TRUST_PROXY=true (Render), según el
 * proxy. Se toma la ÚLTIMA dirección de X-Forwarded-For: la agrega nuestro
 * proxy; las anteriores las puede inventar el cliente.
 */
export function calcularIpCliente(req: IncomingMessage): string {
  if (env().TRUST_PROXY) {
    const reenviada = req.headers["x-forwarded-for"];
    const lista = (Array.isArray(reenviada) ? reenviada.join(",") : (reenviada ?? ""))
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    const ultima = lista.at(-1);
    if (ultima) return ultima;
  }
  return req.socket.remoteAddress ?? "desconocida";
}

/**
 * IP del cliente dentro de Next (acciones de servidor, rutas, páginas).
 * Uso: `ipCliente(await headers())`. La necesita el límite de intentos.
 */
export function ipCliente(cabeceras: CabecerasLeibles): string {
  return cabeceras.get(CABECERA_IP_CLIENTE) ?? "desconocida";
}

function origenDe(valor: string | null): string | null {
  if (!valor) return null;
  try {
    return new URL(valor).origin;
  } catch {
    return null;
  }
}

/**
 * true si la petición viene de nuestra propia aplicación (defensa CSRF).
 * Se compara con APP_URL y no con Host, para que funcione igual detrás del proxy.
 * Sin Origin ni Referer se rechaza: los navegadores actuales siempre envían
 * Origin en los POST.
 */
export function origenPermitido(cabeceras: CabecerasLeibles): boolean {
  const origen = origenDe(cabeceras.get("origin")) ?? origenDe(cabeceras.get("referer"));
  return origen !== null && origen === new URL(env().APP_URL).origin;
}
