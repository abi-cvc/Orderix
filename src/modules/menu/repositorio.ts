/**
 * Repositorio de menu: el ÚNICO archivo del módulo que toca la base.
 * Tabla propia: productos.
 *
 * Frente B (Ricardo): aquí van las consultas del CRUD de productos (búsqueda,
 * paginación, crear, editar, desactivar). Las dos funciones de abajo las usa
 * pedidos; si cambias sus nombres o campos, avisa al frente C.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface ProductoParaPedido {
  id: number;
  nombre: string;
  /** Precio como texto con 2 decimales ("4.50"): exacto y serializable. */
  precio: string;
  disponible: boolean;
}

export interface ProductoGuardado {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precio: string;
  disponible: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

const campos = { id: true, nombre: true, precio: true, disponible: true } as const;
const camposCrud = {
  id: true,
  nombre: true,
  descripcion: true,
  categoria: true,
  precio: true,
  disponible: true,
  creadoEn: true,
  actualizadoEn: true,
} satisfies Prisma.ProductoSelect;

function aProducto(fila: {
  id: number;
  nombre: string;
  precio: { toFixed(decimales: number): string };
  disponible: boolean;
}): ProductoParaPedido {
  return { ...fila, precio: fila.precio.toFixed(2) };
}

type FilaProducto = Prisma.ProductoGetPayload<{ select: typeof camposCrud }>;

function aProductoGuardado(fila: FilaProducto): ProductoGuardado {
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

export interface ConsultaProductos {
  nombre?: string;
  categoria?: string;
  disponible?: boolean;
  salto: number;
  cantidad: number;
}

export async function listar(
  consulta: ConsultaProductos,
): Promise<{ productos: ProductoGuardado[]; total: number }> {
  const where: Prisma.ProductoWhereInput = {
    nombre: consulta.nombre ? { contains: consulta.nombre, mode: "insensitive" } : undefined,
    categoria: consulta.categoria || undefined,
    disponible: consulta.disponible,
  };
  const [filas, total] = await prisma().$transaction([
    prisma().producto.findMany({
      where,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: consulta.salto,
      take: consulta.cantidad,
      select: camposCrud,
    }),
    prisma().producto.count({ where }),
  ]);
  return { productos: filas.map(aProductoGuardado), total };
}

export function buscarPorId(id: number): Promise<ProductoGuardado | null> {
  return prisma()
    .producto.findUnique({ where: { id }, select: camposCrud })
    .then((fila) => (fila ? aProductoGuardado(fila) : null));
}

export function crear(datos: {
  nombre: string;
  descripcion?: string;
  categoria: string;
  precio: string;
}): Promise<ProductoGuardado> {
  return prisma().producto.create({ data: datos, select: camposCrud }).then(aProductoGuardado);
}

export function editar(
  id: number,
  datos: { nombre: string; descripcion?: string; categoria: string; precio: string },
): Promise<ProductoGuardado> {
  return prisma()
    .producto.update({ where: { id }, data: datos, select: camposCrud })
    .then(aProductoGuardado);
}

export function desactivar(id: number): Promise<ProductoGuardado> {
  return prisma()
    .producto.update({ where: { id }, data: { disponible: false }, select: camposCrud })
    .then(aProductoGuardado);
}

export function eliminar(id: number): Promise<void> {
  return prisma()
    .producto.delete({ where: { id }, select: { id: true } })
    .then(() => undefined);
}
