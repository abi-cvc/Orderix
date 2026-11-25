import { z } from "@/lib/zod";

/** Rango máximo de un reporte: acota cuántos pedidos se cargan en memoria. */
export const MAXIMO_DIAS_REPORTE = 366;

const fechaIsoValida = z.iso.date({ error: "Ingresa una fecha válida." });

function diasEntre(desde: string, hasta: string): number {
  return (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000;
}

export const esquemaReporteMeseros = z
  .object({
    desde: fechaIsoValida,
    hasta: fechaIsoValida,
  })
  .refine((fechas) => fechas.desde <= fechas.hasta, {
    path: ["hasta"],
    message: "La fecha de inicio debe ser anterior o igual a la fecha de fin.",
  })
  .refine((fechas) => diasEntre(fechas.desde, fechas.hasta) < MAXIMO_DIAS_REPORTE, {
    path: ["hasta"],
    message: `El período puede abarcar como máximo ${MAXIMO_DIAS_REPORTE} días.`,
  });

export type FiltroReporteMeseros = z.output<typeof esquemaReporteMeseros>;
