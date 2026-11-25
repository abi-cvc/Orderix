import { z } from "@/lib/zod";

const fechaIsoValida = z.iso.date({ error: "Ingresa una fecha válida." });

export const esquemaReporteMeseros = z
  .object({
    desde: fechaIsoValida,
    hasta: fechaIsoValida,
  })
  .refine((fechas) => fechas.desde <= fechas.hasta, {
    path: ["hasta"],
    message: "La fecha de inicio debe ser anterior o igual a la fecha de fin.",
  });

export type FiltroReporteMeseros = z.output<typeof esquemaReporteMeseros>;
