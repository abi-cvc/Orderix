/**
 * Formato de importes y fechas para mostrar. La zona horaria es fija (Ecuador)
 * para que el servidor en Render (UTC) muestre la misma hora que el restaurante.
 */
const ZONA = "America/Guayaquil";

const formatoMoneda = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const formatoHora = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZONA,
});
const formatoFechaHora = new Intl.DateTimeFormat("es-EC", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZONA,
});

/** "12.50" → "$12,50" */
export function moneda(importe: string | number): string {
  return formatoMoneda.format(Number(importe));
}

/** Multiplica un precio en texto por una cantidad, en centavos. */
export function subtotal(precio: string, cantidad: number): string {
  return ((Math.round(Number(precio) * 100) * cantidad) / 100).toFixed(2);
}

export function hora(fecha: Date | string): string {
  return formatoHora.format(new Date(fecha));
}

export function fechaHora(fecha: Date | string): string {
  return formatoFechaHora.format(new Date(fecha));
}

/** "hace 12 min" para la cola de cocina. */
export function minutosDesde(fecha: Date | string, ahora = Date.now()): string {
  const minutos = Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60_000));
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  return `hace ${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

/** Minutos enteros transcurridos desde una fecha (para clasificar la espera). */
export function minutosEsperando(fecha: Date | string, ahora = Date.now()): number {
  return Math.max(0, Math.floor((ahora - new Date(fecha).getTime()) / 60_000));
}
