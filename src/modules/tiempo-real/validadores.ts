/**
 * Validadores del módulo tiempo-real (chat y salas).
 *
 * Archivo seguro para el navegador: el formulario o componente de chat usa los
 * mismos esquemas para validar antes de enviar, y el servicio los vuelve a usar
 * en el servidor. No importa nada específico del servidor ni base de datos.
 */
import { z } from "zod";

export const SALA_GENERAL = "general";
export const LONGITUD_MAXIMA_TEXTO = 1000;
export const LONGITUD_MAXIMA_SALA = 60;

/**
 * Esquema para el nombre de sala.
 * Si no se especifica (undefined), por defecto asigna la sala general.
 */
export const esquemaNombreSala = z
  .string({ error: "El nombre de la sala debe ser un texto." })
  .trim()
  .min(1, "El nombre de la sala no puede estar vacío.")
  .max(LONGITUD_MAXIMA_SALA, "El nombre de la sala no puede superar los 60 caracteres.")
  .default(SALA_GENERAL);

/**
 * Esquema para el texto del mensaje:
 * 1. Se eliminan caracteres de control (\p{Cc}).
 * 2. Se recortan espacios en los extremos (trim).
 * 3. Obligatorio (mínimo 1 carácter tras limpieza).
 * 4. Máximo 1000 caracteres.
 */
export const esquemaTextoMensaje = z
  .string({ error: "El mensaje debe ser un texto." })
  .transform((val) => val.replace(/\p{Cc}/gu, "").trim())
  .pipe(
    z
      .string()
      .min(1, "El mensaje no puede estar vacío.")
      .max(LONGITUD_MAXIMA_TEXTO, "El mensaje no puede superar los 1000 caracteres."),
  );

/**
 * Esquema del mensaje de chat: texto y sala (opcional, por defecto "general").
 */
export const esquemaEnviarMensaje = z.object({
  texto: esquemaTextoMensaje,
  sala: esquemaNombreSala,
});

export type EntradaEnviarMensaje = z.input<typeof esquemaEnviarMensaje>;
export type DatosEnviarMensaje = z.output<typeof esquemaEnviarMensaje>;

export type EntradaNombreSala = z.input<typeof esquemaNombreSala>;
export type DatosNombreSala = z.output<typeof esquemaNombreSala>;
