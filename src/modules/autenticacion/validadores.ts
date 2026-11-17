/** Esquemas compartidos por los formularios y el servicio, sin dependencias de servidor. */
import { z } from "zod";

const correo = z
  .string({ error: "Ingresa tu correo." })
  .trim()
  .toLowerCase()
  .max(254, "El correo admite hasta 254 caracteres.")
  .pipe(z.email({ error: "Ingresa un correo válido." }));

// La clave se conserva exactamente como se escribe, incluidos los espacios.
const clave = z
  .string({ error: "Ingresa tu clave." })
  .min(10, "La clave debe tener al menos 10 caracteres.");

export const esquemaRegistro = z.object({
  nombre: z
    .string({ error: "Ingresa tu nombre." })
    .trim()
    .min(1, "Ingresa tu nombre.")
    .max(100, "El nombre admite hasta 100 caracteres."),
  correo,
  clave,
});

export const esquemaLogin = z.object({
  correo,
  clave: z.string({ error: "Ingresa tu clave." }).min(1, "Ingresa tu clave."),
});

export const esquemaSolicitarRecuperacion = z.object({ correo });

export const esquemaRestablecerClave = z.object({
  token: z
    .string({ error: "El enlace de recuperación no es válido." })
    .regex(/^[A-Za-z0-9_-]{43}$/, "El enlace de recuperación no es válido."),
  clave,
});

export type EntradaRegistro = z.input<typeof esquemaRegistro>;
export type DatosRegistro = z.output<typeof esquemaRegistro>;
export type EntradaLogin = z.input<typeof esquemaLogin>;
export type DatosLogin = z.output<typeof esquemaLogin>;
export type EntradaSolicitarRecuperacion = z.input<typeof esquemaSolicitarRecuperacion>;
export type DatosSolicitarRecuperacion = z.output<typeof esquemaSolicitarRecuperacion>;
export type EntradaRestablecerClave = z.input<typeof esquemaRestablecerClave>;
export type DatosRestablecerClave = z.output<typeof esquemaRestablecerClave>;
