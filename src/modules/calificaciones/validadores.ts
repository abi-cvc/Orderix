/**
 * Validadores del módulo calificaciones.
 *
 * Archivo seguro para el navegador: el formulario usa el MISMO esquema para
 * validar antes de enviar, y el servicio lo vuelve a usar en el servidor.
 */
import { z } from "@/lib/zod";

export const PUNTAJE_MINIMO = 1;
export const PUNTAJE_MAXIMO = 5;

/** Texto de cada carita: la calificación nunca depende solo del ícono o del color. */
export const ETIQUETAS_PUNTAJE: Record<number, string> = {
  1: "Muy malo",
  2: "Malo",
  3: "Regular",
  4: "Bueno",
  5: "Excelente",
};

export const esquemaCrearCalificacion = z.object({
  pedidoId: z.coerce
    .number({ error: "El pedido debe ser un número." })
    .int("El pedido debe ser un número entero.")
    .positive("El pedido no es válido."),
  puntaje: z.coerce
    .number({ error: "Elige una carita." })
    .int("Elige una carita.")
    .min(PUNTAJE_MINIMO, "Elige una carita del 1 al 5.")
    .max(PUNTAJE_MAXIMO, "Elige una carita del 1 al 5."),
});

export type EntradaCrearCalificacion = z.input<typeof esquemaCrearCalificacion>;
export type DatosCrearCalificacion = z.output<typeof esquemaCrearCalificacion>;
