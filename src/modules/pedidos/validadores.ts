/**
 * Validadores del módulo pedidos.
 *
 * Archivo seguro para el navegador: los formularios usan los MISMOS esquemas
 * para validar antes de enviar, y el servicio los vuelve a usar en el servidor.
 */
import { z } from "zod";
import { EstadoPedido } from "@/generated/prisma/enums";

/** Mesas del restaurante (las mismas que usa prisma/seed-volumen.ts). */
export const MESAS = 12;
export const CANTIDAD_MAXIMA = 20;
export const ITEMS_MAXIMOS = 30;
export const LARGO_ALERGIAS = 300;
export const LARGO_NOTAS_ITEM = 300;
export const LARGO_NOTAS_PEDIDO = 500;

const identificador = (que: string) =>
  z.coerce
    .number({ error: `${que} no es válido.` })
    .int(`${que} no es válido.`)
    .positive(`${que} no es válido.`);

/** Texto opcional: recorta espacios y convierte "" en undefined. */
const textoOpcional = (maximo: number, que: string) =>
  z
    .string()
    .trim()
    .max(maximo, `${que} puede tener hasta ${maximo} caracteres.`)
    .optional()
    .transform((valor) => valor || undefined);

const cantidad = z.coerce
  .number({ error: "Escribe la cantidad." })
  .int("La cantidad es un número entero.")
  .min(1, "La cantidad mínima es 1.")
  .max(CANTIDAD_MAXIMA, `La cantidad máxima es ${CANTIDAD_MAXIMA}.`);

export const esquemaItem = z.object({
  productoId: z.coerce
    .number({ error: "Elige un producto." })
    .int("Elige un producto.")
    .positive("Elige un producto."),
  cantidad,
  alergias: textoOpcional(LARGO_ALERGIAS, "Las alergias"),
  notas: textoOpcional(LARGO_NOTAS_ITEM, "Las notas"),
});

/** Los formularios envían la lista de ítems como JSON en un campo oculto. */
const listaItems = z.preprocess(
  (valor) => {
    if (typeof valor !== "string") return valor;
    try {
      return JSON.parse(valor);
    } catch {
      return valor;
    }
  },
  z
    .array(esquemaItem, { error: "Agrega al menos un producto." })
    .min(1, "Agrega al menos un producto.")
    .max(ITEMS_MAXIMOS, `Un pedido puede tener hasta ${ITEMS_MAXIMOS} productos.`),
);

export const esquemaCrearPedido = z.object({
  numeroMesa: z.coerce
    .number({ error: "Elige la mesa." })
    .int("Elige la mesa.")
    .min(1, `La mesa va de 1 a ${MESAS}.`)
    .max(MESAS, `La mesa va de 1 a ${MESAS}.`),
  notas: textoOpcional(LARGO_NOTAS_PEDIDO, "Las notas del pedido"),
  items: listaItems,
});

export const esquemaAgregarItems = z.object({
  pedidoId: identificador("El pedido"),
  items: listaItems,
});

export const esquemaEditarItem = z.object({
  itemId: identificador("El producto del pedido"),
  cantidad,
  alergias: textoOpcional(LARGO_ALERGIAS, "Las alergias"),
  notas: textoOpcional(LARGO_NOTAS_ITEM, "Las notas"),
});

export const esquemaQuitarItem = z.object({
  itemId: identificador("El producto del pedido"),
});

export const esquemaCambiarEstado = z.object({
  pedidoId: identificador("El pedido"),
  estado: z.enum(EstadoPedido, { error: "El estado no es válido." }),
});

/** Filtros de la URL del listado. Un filtro inválido se ignora en lugar de fallar. */
const filtroNumero = z.preprocess(
  (valor) => (valor === "" || valor === undefined ? undefined : valor),
  z.coerce.number().int().positive().optional().catch(undefined),
);

export const esquemaFiltroPedidos = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
  id: filtroNumero,
  mesa: filtroNumero,
  estado: z.enum(EstadoPedido).optional().catch(undefined),
});

export type DatosItem = z.output<typeof esquemaItem>;
export type DatosCrearPedido = z.output<typeof esquemaCrearPedido>;
export type FiltroPedidos = z.output<typeof esquemaFiltroPedidos>;
