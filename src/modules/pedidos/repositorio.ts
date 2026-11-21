/**
 * Repositorio de pedidos: el ÚNICO archivo del módulo que toca la base.
 * Tablas propias: pedidos, items_pedido, cambios_estado.
 *
 * Los importes salen como texto con 2 decimales ("12.50"): exactos y
 * serializables para enviarlos a componentes del navegador.
 */
import type { Prisma } from "@/generated/prisma/client";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// ------------------------------------------------------------------ tipos

export interface ItemGuardado {
  id: number;
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: string;
  alergias: string | null;
  notas: string | null;
  agregadoEn: Date;
}

export interface PedidoGuardado {
  id: number;
  numeroMesa: number;
  meseroId: number;
  meseroNombre: string;
  estado: EstadoPedido;
  total: string;
  notas: string | null;
  creadoEn: Date;
  cerradoEn: Date | null;
  items: ItemGuardado[];
}

export interface CambioGuardado {
  id: number;
  estado: EstadoPedido;
  usuarioId: number;
  fecha: Date;
}

export interface NuevoItem {
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: string;
  alergias?: string;
  notas?: string;
}

// ------------------------------------------------------------------ select

const camposItem = {
  id: true,
  productoId: true,
  nombreProducto: true,
  cantidad: true,
  precioUnitario: true,
  alergias: true,
  notas: true,
  agregadoEn: true,
} satisfies Prisma.ItemPedidoSelect;

const camposPedido = {
  id: true,
  numeroMesa: true,
  meseroId: true,
  meseroNombre: true,
  estado: true,
  total: true,
  notas: true,
  creadoEn: true,
  cerradoEn: true,
  // Los ítems vienen en la MISMA consulta que el pedido (sin N+1).
  items: { select: camposItem, orderBy: [{ agregadoEn: "asc" }, { id: "asc" }] },
} satisfies Prisma.PedidoSelect;

type FilaPedido = Prisma.PedidoGetPayload<{ select: typeof camposPedido }>;

function aPedido(fila: FilaPedido): PedidoGuardado {
  return {
    ...fila,
    total: fila.total.toFixed(2),
    items: fila.items.map((item) => ({ ...item, precioUnitario: item.precioUnitario.toFixed(2) })),
  };
}

/** Suma cantidad × precio en centavos (enteros) para no arrastrar errores de redondeo. */
export function calcularTotal(items: { cantidad: number; precioUnitario: string }[]): string {
  const centavos = items.reduce(
    (suma, item) => suma + item.cantidad * Math.round(Number(item.precioUnitario) * 100),
    0,
  );
  return (centavos / 100).toFixed(2);
}

/** Recalcula y guarda el total del pedido dentro de una transacción. */
async function actualizarTotal(tx: Prisma.TransactionClient, pedidoId: number): Promise<void> {
  const items = await tx.itemPedido.findMany({
    where: { pedidoId },
    select: { cantidad: true, precioUnitario: true },
  });
  const total = calcularTotal(
    items.map((item) => ({
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario.toFixed(2),
    })),
  );
  await tx.pedido.update({ where: { id: pedidoId }, data: { total } });
}

// ------------------------------------------------------------------ lectura

export async function buscarPedido(id: number): Promise<PedidoGuardado | null> {
  const fila = await prisma().pedido.findUnique({ where: { id }, select: camposPedido });
  return fila ? aPedido(fila) : null;
}

/** Lo mínimo para autorizar: estado, dueño y mesa. */
export function buscarResumen(
  id: number,
): Promise<{ id: number; estado: EstadoPedido; meseroId: number; numeroMesa: number } | null> {
  return prisma().pedido.findUnique({
    where: { id },
    select: { id: true, estado: true, meseroId: true, numeroMesa: true },
  });
}

export function buscarCambios(pedidoId: number): Promise<CambioGuardado[]> {
  return prisma().cambioEstado.findMany({
    where: { pedidoId },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
    select: { id: true, estado: true, usuarioId: true, fecha: true },
  });
}

/** Ítem con los datos de su pedido, para autorizar cambios en el ítem. */
export function buscarItem(itemId: number) {
  return prisma().itemPedido.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      pedidoId: true,
      nombreProducto: true,
      alergias: true,
      pedido: { select: { estado: true, meseroId: true, numeroMesa: true } },
    },
  });
}

export interface ConsultaListado {
  meseroId?: number;
  id?: number;
  numeroMesa?: number;
  estado?: EstadoPedido;
  salto: number;
  cantidad: number;
}

/** Una página del listado y el total de coincidencias. Orden fijo para paginar estable. */
export async function listar(
  consulta: ConsultaListado,
): Promise<{ pedidos: PedidoGuardado[]; total: number }> {
  const where: Prisma.PedidoWhereInput = {
    meseroId: consulta.meseroId,
    id: consulta.id,
    numeroMesa: consulta.numeroMesa,
    estado: consulta.estado,
  };
  const [filas, total] = await prisma().$transaction([
    prisma().pedido.findMany({
      where,
      orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
      skip: consulta.salto,
      take: consulta.cantidad,
      select: camposPedido,
    }),
    prisma().pedido.count({ where }),
  ]);
  return { pedidos: filas.map(aPedido), total };
}

/** Pedidos en ciertos estados, los más antiguos primero (cola de cocina, caja). */
export async function listarPorEstados(estados: EstadoPedido[]): Promise<PedidoGuardado[]> {
  const filas = await prisma().pedido.findMany({
    where: { estado: { in: estados } },
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
    take: 100,
    select: camposPedido,
  });
  return filas.map(aPedido);
}

export async function listarDeMeseroEntreFechas(
  meseroId: number,
  desde: Date,
  hasta: Date,
): Promise<PedidoGuardado[]> {
  const filas = await prisma().pedido.findMany({
    where: { meseroId, creadoEn: { gte: desde, lt: hasta } },
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
    select: camposPedido,
  });
  return filas.map(aPedido);
}

/** Fila del resumen de servicio: datos mínimos del pedido y sus cambios de estado. */
export interface FilaResumen {
  id: number;
  numeroMesa: number;
  meseroId: number;
  meseroNombre: string;
  estado: EstadoPedido;
  total: string;
  creadoEn: Date;
  cambios: { estado: EstadoPedido; fecha: Date }[];
}

/**
 * Pedidos creados en [desde, hasta), de un mesero o de todos, con sus cambios
 * de estado en la MISMA consulta (sin N+1). Lo usa el reporte por mesero.
 */
export async function listarResumen(filtro: {
  meseroId?: number;
  desde: Date;
  hasta: Date;
}): Promise<FilaResumen[]> {
  const filas = await prisma().pedido.findMany({
    where: { meseroId: filtro.meseroId, creadoEn: { gte: filtro.desde, lt: filtro.hasta } },
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
    select: {
      id: true,
      numeroMesa: true,
      meseroId: true,
      meseroNombre: true,
      estado: true,
      total: true,
      creadoEn: true,
      cambios: {
        select: { estado: true, fecha: true },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
      },
    },
  });
  return filas.map((fila) => ({ ...fila, total: fila.total.toFixed(2) }));
}

// ------------------------------------------------------------------ escritura

/** Crea el pedido con sus ítems y el primer cambio de estado, todo o nada. */
export async function crearPedido(datos: {
  numeroMesa: number;
  meseroId: number;
  meseroNombre: string;
  notas?: string;
  items: NuevoItem[];
}): Promise<PedidoGuardado> {
  const fila = await prisma().pedido.create({
    data: {
      numeroMesa: datos.numeroMesa,
      meseroId: datos.meseroId,
      meseroNombre: datos.meseroNombre,
      notas: datos.notas,
      total: calcularTotal(datos.items),
      items: { create: datos.items },
      cambios: { create: { estado: "CREADO", usuarioId: datos.meseroId } },
    },
    select: camposPedido,
  });
  return aPedido(fila);
}

/** Agrega ítems (pedido adicional) y recalcula el total. Devuelve los ítems nuevos. */
export async function agregarItems(pedidoId: number, items: NuevoItem[]): Promise<ItemGuardado[]> {
  return prisma().$transaction(async (tx) => {
    const creados = [];
    for (const item of items) {
      creados.push(await tx.itemPedido.create({ data: { ...item, pedidoId }, select: camposItem }));
    }
    await actualizarTotal(tx, pedidoId);
    return creados.map((item) => ({ ...item, precioUnitario: item.precioUnitario.toFixed(2) }));
  });
}

export async function editarItem(
  itemId: number,
  pedidoId: number,
  datos: { cantidad: number; alergias: string | null; notas: string | null },
): Promise<void> {
  await prisma().$transaction(async (tx) => {
    await tx.itemPedido.update({ where: { id: itemId }, data: datos });
    await actualizarTotal(tx, pedidoId);
  });
}

export async function quitarItem(itemId: number, pedidoId: number): Promise<void> {
  await prisma().$transaction(async (tx) => {
    await tx.itemPedido.delete({ where: { id: itemId } });
    await actualizarTotal(tx, pedidoId);
  });
}

/**
 * Cambia el estado SOLO si sigue siendo `de` (evita que dos personas cobren o
 * cancelen el mismo pedido a la vez) y registra quién y cuándo.
 * Devuelve false si otro cambio se adelantó.
 */
export async function cambiarEstado(datos: {
  pedidoId: number;
  de: EstadoPedido;
  a: EstadoPedido;
  usuarioId: number;
  cerrar: boolean;
}): Promise<Date | false> {
  return prisma().$transaction(async (tx) => {
    const fecha = new Date();
    const { count } = await tx.pedido.updateMany({
      where: { id: datos.pedidoId, estado: datos.de },
      data: { estado: datos.a, ...(datos.cerrar ? { cerradoEn: fecha } : {}) },
    });
    if (count === 0) return false;
    await tx.cambioEstado.create({
      data: { pedidoId: datos.pedidoId, estado: datos.a, usuarioId: datos.usuarioId, fecha },
    });
    return fecha;
  });
}
