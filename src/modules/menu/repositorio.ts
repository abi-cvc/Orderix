/**
 * Repositorio de menu: el ÚNICO archivo del módulo que toca la base.
 * Tabla propia: productos.
 *
 * Frente B (Ricardo): aquí van las consultas del CRUD de productos (búsqueda,
 * paginación, crear, editar, desactivar). Las dos funciones de abajo las usa
 * pedidos; si cambias sus nombres o campos, avisa al frente C.
 */
import { prisma } from "@/lib/prisma";

export interface ProductoParaPedido {
  id: number;
  nombre: string;
  /** Precio como texto con 2 decimales ("4.50"): exacto y serializable. */
  precio: string;
  disponible: boolean;
}

const campos = { id: true, nombre: true, precio: true, disponible: true } as const;

function aProducto(fila: {
  id: number;
  nombre: string;
  precio: { toFixed(decimales: number): string };
  disponible: boolean;
}): ProductoParaPedido {
  return { ...fila, precio: fila.precio.toFixed(2) };
}

export async function buscarPorIds(ids: number[]): Promise<ProductoParaPedido[]> {
  const filas = await prisma().producto.findMany({ where: { id: { in: ids } }, select: campos });
  return filas.map(aProducto);
}

export async function listarDisponibles(): Promise<ProductoParaPedido[]> {
  const filas = await prisma().producto.findMany({
    where: { disponible: true },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    select: campos,
  });
  return filas.map(aProducto);
}
