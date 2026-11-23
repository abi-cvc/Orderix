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

const formatoHora24 = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: ZONA,
});

const formatoDiaMes = new Intl.DateTimeFormat("es-EC", {
  day: "2-digit",
  month: "2-digit",
  timeZone: ZONA,
});

const formatoPartesFecha = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: ZONA,
});

function obtenerComponentesFechaEcuador(fecha: Date): { anio: number; mes: number; dia: number } {
  const partes = formatoPartesFecha.formatToParts(fecha);
  let anio = 0;
  let mes = 0;
  let dia = 0;
  for (const p of partes) {
    if (p.type === "year") anio = Number(p.value);
    if (p.type === "month") mes = Number(p.value);
    if (p.type === "day") dia = Number(p.value);
  }
  return { anio, mes, dia };
}

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

/**
 * Formatea una fecha de mensaje en hora relativa respecto a la zona horaria de Ecuador:
 * - Menos de 1 minuto o fecha futura: "ahora"
 * - De 1 a 59 minutos: "hace N min"
 * - Mismo día (a partir de 60 minutos): "hoy HH:mm"
 * - Día anterior: "ayer HH:mm"
 * - Días anteriores: "dd/MM HH:mm"
 */
export function formatearHoraRelativa(
  fecha: Date | string,
  ahora: Date | string | number = Date.now(),
): string {
  const dFecha = typeof fecha === "string" ? new Date(fecha) : fecha;
  const dAhora =
    typeof ahora === "number"
      ? new Date(ahora)
      : typeof ahora === "string"
        ? new Date(ahora)
        : ahora;

  const msFecha = dFecha.getTime();
  const msAhora = dAhora.getTime();

  // Menos de 1 minuto o fecha futura (por diferencias de reloj)
  if (msFecha > msAhora || msAhora - msFecha < 60_000) {
    return "ahora";
  }

  const minutos = Math.floor((msAhora - msFecha) / 60_000);
  if (minutos < 60) {
    return `hace ${minutos} min`;
  }

  const compAhora = obtenerComponentesFechaEcuador(dAhora);
  const compFecha = obtenerComponentesFechaEcuador(dFecha);
  const utcHoy = Date.UTC(compAhora.anio, compAhora.mes - 1, compAhora.dia);
  const utcFecha = Date.UTC(compFecha.anio, compFecha.mes - 1, compFecha.dia);
  const diasDiferencia = Math.round((utcHoy - utcFecha) / 86_400_000);

  const horaStr = formatoHora24.format(dFecha);

  if (diasDiferencia <= 0) {
    return `hoy ${horaStr}`;
  }

  if (diasDiferencia === 1) {
    return `ayer ${horaStr}`;
  }

  const diaMesStr = formatoDiaMes.format(dFecha);
  return `${diaMesStr} ${horaStr}`;
}
