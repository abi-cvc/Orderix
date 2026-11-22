import { z } from "@/lib/zod";

export const LARGO_NOMBRE = 120;
export const LARGO_DESCRIPCION = 500;
export const LARGO_CATEGORIA = 60;

const identificador = z.coerce
  .number({ error: "El producto no es válido." })
  .int("El producto no es válido.")
  .positive("El producto no es válido.");

const textoRequerido = (maximo: number, campo: string) =>
  z
    .string({ error: `Escribe ${campo}.` })
    .trim()
    .min(1, `Escribe ${campo}.`)
    .max(maximo, `${campo} puede tener hasta ${maximo} caracteres.`);

const descripcion = z
  .string()
  .trim()
  .max(LARGO_DESCRIPCION, `La descripción puede tener hasta ${LARGO_DESCRIPCION} caracteres.`)
  .optional()
  .transform((valor) => valor || undefined);

const precio = z.coerce
  .number({ error: "Escribe un precio." })
  .finite("Escribe un precio válido.")
  .min(0, "El precio no puede ser negativo.")
  .max(99999999.99, "El precio es demasiado alto.")
  .transform((valor) => valor.toFixed(2));

export const esquemaCrearProducto = z.object({
  nombre: textoRequerido(LARGO_NOMBRE, "el nombre"),
  descripcion,
  categoria: textoRequerido(LARGO_CATEGORIA, "la categoría"),
  precio,
});

export const esquemaEditarProducto = esquemaCrearProducto.extend({ id: identificador });

const filtroTexto = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .optional()
    .transform((valor) => valor || undefined)
    .catch(undefined);

const filtroBooleano = z.preprocess(
  (valor) => (valor === "" || valor === undefined ? undefined : valor),
  z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional()
    .catch(undefined),
);

export const esquemaFiltroProductos = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  nombre: filtroTexto(LARGO_NOMBRE),
  categoria: filtroTexto(LARGO_CATEGORIA),
  disponible: filtroBooleano,
});

export const esquemaProductoId = z.object({ id: identificador });

export type DatosCrearProducto = z.output<typeof esquemaCrearProducto>;
export type DatosEditarProducto = z.output<typeof esquemaEditarProducto>;
export type FiltroProductos = z.output<typeof esquemaFiltroProductos>;
