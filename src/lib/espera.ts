/**
 * Umbrales de espera de la cocina. Archivo común (sin "use client") para que lo
 * usen tanto la página del servidor como el componente del navegador: un
 * servidor que importa un valor desde un archivo "use client" recibe una
 * referencia vacía, no el valor.
 */

/** Minutos de espera a partir de los cuales un pedido se marca como demorado o urgente. */
export const MINUTOS_DEMORADO = 15;
export const MINUTOS_URGENTE = 25;

export type NivelEspera = "normal" | "demorado" | "urgente";

export function nivelDeEspera(minutos: number): NivelEspera {
  if (minutos >= MINUTOS_URGENTE) return "urgente";
  if (minutos >= MINUTOS_DEMORADO) return "demorado";
  return "normal";
}
