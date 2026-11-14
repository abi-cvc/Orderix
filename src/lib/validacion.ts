import type { z } from "zod";
import { ErrorValidacion } from "@/lib/errores";

/**
 * Valida `entrada` con un esquema Zod. Si falla, lanza ErrorValidacion con los
 * mensajes agrupados por campo, listos para mostrarse junto a cada input.
 *
 * Los servicios SIEMPRE revalidan con esto, aunque el formulario ya haya
 * validado en el navegador: el servidor nunca confía en lo que recibe.
 */
export function validar<T extends z.ZodType>(esquema: T, entrada: unknown): z.output<T> {
  const resultado = esquema.safeParse(entrada);
  if (resultado.success) return resultado.data;

  const campos: Record<string, string[]> = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path.join(".") || "_formulario";
    (campos[campo] ??= []).push(issue.message);
  }
  throw new ErrorValidacion(campos);
}
