/**
 * Servicio de pedidos: la lógica de negocio del módulo (frente C).
 *
 * Cada función recibe el usuario de la sesión y la entrada sin validar, vuelve
 * a comprobar el permiso, valida con Zod, aplica las reglas del flujo
 * (estados.ts) y publica los avisos en tiempo real.
 *
 * Las dependencias de otros módulos llegan como parámetro opcional para poder
 * reemplazarlas en las pruebas (mismo patrón que calificaciones).
 */
import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/lib/errores";
import { FILAS_POR_PAGINA } from "@/lib/pagina";
import { validar } from "@/lib/validacion";
import { obtenerNombresDeUsuarios, type UsuarioSesion } from "@/modules/autenticacion";
import { obtenerProductosParaPedido } from "@/modules/menu";
import { publicarEvento } from "@/modules/tiempo-real";
import {
  ESTADOS_FINALES,
  ESTADOS_QUITAR_ITEMS,
  estadosPermitidos,
  puedeEditarItems,
} from "./estados";
import * as repositorio from "./repositorio";
import {
  esquemaAgregarItems,
  esquemaCambiarEstado,
  esquemaCrearPedido,
  esquemaEditarItem,
  esquemaFiltroPedidos,
  esquemaQuitarItem,
  type DatosItem,
} from "./validadores";

export interface DependenciasPedidos {
  repositorio: typeof repositorio;
  obtenerProductosParaPedido: typeof obtenerProductosParaPedido;
  obtenerNombresDeUsuarios: typeof obtenerNombresDeUsuarios;
  publicarEvento: typeof publicarEvento;
}

const dependenciasReales: DependenciasPedidos = {
  repositorio,
  obtenerProductosParaPedido,
  obtenerNombresDeUsuarios,
  publicarEvento,
};

export type { CambioGuardado, ItemGuardado, PedidoGuardado } from "./repositorio";

// ------------------------------------------------------------------ ayudas

function exigirRol(usuario: UsuarioSesion, ...roles: Rol[]): void {
  if (!roles.includes(usuario.rol)) throw new ErrorProhibido();
}

/**
 * Convierte los ítems del formulario en ítems con nombre y precio copiados del
 * menú. El precio SIEMPRE sale del servidor, nunca del navegador.
 */
async function prepararItems(
  items: DatosItem[],
  deps: DependenciasPedidos,
): Promise<repositorio.NuevoItem[]> {
  const productos = await deps.obtenerProductosParaPedido(items.map((item) => item.productoId));
  const porId = new Map(productos.map((producto) => [producto.id, producto]));

  return items.map((item, indice) => {
    const producto = porId.get(item.productoId);
    if (!producto || !producto.disponible) {
      throw new ErrorValidacion({
        [`items.${indice}.productoId`]: [
          producto ? `"${producto.nombre}" no está disponible.` : "El producto no existe.",
        ],
      });
    }
    return {
      productoId: producto.id,
      nombreProducto: producto.nombre,
      cantidad: item.cantidad,
      precioUnitario: producto.precio,
      alergias: item.alergias,
      notas: item.notas,
    };
  });
}

/** Pedido que el usuario puede ver; para un mesero, solo los suyos. */
async function pedidoVisible(usuario: UsuarioSesion, pedidoId: number, deps: DependenciasPedidos) {
  const pedido = await deps.repositorio.buscarResumen(pedidoId);
  // Un pedido ajeno responde igual que uno inexistente: no se revela que existe.
  if (!pedido || (usuario.rol === Rol.MESERO && pedido.meseroId !== usuario.id)) {
    throw new ErrorNoEncontrado("El pedido no existe.");
  }
  return pedido;
}

function avisarAlergia(
  deps: DependenciasPedidos,
  datos: { pedidoId: number; numeroMesa: number; itemId: number; nombreProducto: string },
  alergias: string,
): void {
  deps.publicarEvento("pedido.alergiaAgregada", { ...datos, alergias });
}

// ------------------------------------------------------------------ CRUD

/** El mesero crea un pedido para una mesa. Cocina recibe el aviso. */
export async function crearPedido(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasPedidos = dependenciasReales,
): Promise<repositorio.PedidoGuardado> {
  exigirRol(usuario, Rol.MESERO);
  const datos = validar(esquemaCrearPedido, entrada);
  const items = await prepararItems(datos.items, deps);

  const pedido = await deps.repositorio.crearPedido({
    numeroMesa: datos.numeroMesa,
    meseroId: usuario.id,
    meseroNombre: usuario.nombre,
    notas: datos.notas,
    items,
  });

  deps.publicarEvento("pedido.creado", {
    pedidoId: pedido.id,
    numeroMesa: pedido.numeroMesa,
    meseroId: pedido.meseroId,
    meseroNombre: pedido.meseroNombre,
    cantidadItems: pedido.items.length,
    tieneAlergias: pedido.items.some((item) => item.alergias),
    creadoEn: pedido.creadoEn.toISOString(),
  });
  return pedido;
}

/** Pedido adicional: el mesero dueño agrega ítems mientras cocina no termine. */
export async function agregarItems(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasPedidos = dependenciasReales,
): Promise<void> {
  exigirRol(usuario, Rol.MESERO);
  const datos = validar(esquemaAgregarItems, entrada);
  const pedido = await pedidoVisible(usuario, datos.pedidoId, deps);
  if (!puedeEditarItems(pedido, usuario)) {
    throw new ErrorConflicto(
      "Este pedido ya no admite más productos. Crea un pedido nuevo para la mesa.",
    );
  }

  const nuevos = await deps.repositorio.agregarItems(
    pedido.id,
    await prepararItems(datos.items, deps),
  );
  for (const item of nuevos) {
    if (item.alergias) {
      avisarAlergia(
        deps,
        {
          pedidoId: pedido.id,
          numeroMesa: pedido.numeroMesa,
          itemId: item.id,
          nombreProducto: item.nombreProducto,
        },
        item.alergias,
      );
    }
  }
}

/** El mesero dueño cambia cantidad, alergias o notas de un ítem. */
export async function editarItem(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasPedidos = dependenciasReales,
): Promise<void> {
  exigirRol(usuario, Rol.MESERO);
  const datos = validar(esquemaEditarItem, entrada);
  const item = await deps.repositorio.buscarItem(datos.itemId);
  if (!item || item.pedido.meseroId !== usuario.id) {
    throw new ErrorNoEncontrado("El producto del pedido no existe.");
  }
  if (!puedeEditarItems(item.pedido, usuario)) {
    throw new ErrorConflicto("Este pedido ya no se puede modificar.");
  }

  const alergias = datos.alergias ?? null;
  await deps.repositorio.editarItem(item.id, item.pedidoId, {
    cantidad: datos.cantidad,
    alergias,
    notas: datos.notas ?? null,
  });

  // Alergia nueva o distinta en un pedido ya enviado: alerta para cocina.
  if (alergias && alergias !== item.alergias) {
    avisarAlergia(
      deps,
      {
        pedidoId: item.pedidoId,
        numeroMesa: item.pedido.numeroMesa,
        itemId: item.id,
        nombreProducto: item.nombreProducto,
      },
      alergias,
    );
  }
}

/** El mesero dueño quita un ítem antes de que cocina empiece. */
export async function quitarItem(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasPedidos = dependenciasReales,
): Promise<void> {
  exigirRol(usuario, Rol.MESERO);
  const datos = validar(esquemaQuitarItem, entrada);
  const item = await deps.repositorio.buscarItem(datos.itemId);
  if (!item || item.pedido.meseroId !== usuario.id) {
    throw new ErrorNoEncontrado("El producto del pedido no existe.");
  }
  if (!ESTADOS_QUITAR_ITEMS.includes(item.pedido.estado)) {
    throw new ErrorConflicto("Cocina ya empezó este pedido: no se pueden quitar productos.");
  }
  await deps.repositorio.quitarItem(item.id, item.pedidoId);
}

/**
 * Cambia el estado del pedido según las reglas de estados.ts.
 * "Eliminar" un pedido es cancelarlo: queda el registro y su historial.
 */
export async function cambiarEstado(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasPedidos = dependenciasReales,
): Promise<void> {
  const datos = validar(esquemaCambiarEstado, entrada);
  const pedido = await pedidoVisible(usuario, datos.pedidoId, deps);

  if (!estadosPermitidos(pedido, usuario).includes(datos.estado)) {
    throw ESTADOS_FINALES.includes(pedido.estado)
      ? new ErrorConflicto("Este pedido ya está cerrado.")
      : new ErrorProhibido("No puedes hacer este cambio de estado.");
  }

  const fecha = await deps.repositorio.cambiarEstado({
    pedidoId: pedido.id,
    de: pedido.estado,
    a: datos.estado,
    usuarioId: usuario.id,
    cerrar: ESTADOS_FINALES.includes(datos.estado),
  });
  if (!fecha) {
    throw new ErrorConflicto("Alguien más cambió este pedido. Recarga para ver su estado actual.");
  }

  deps.publicarEvento("pedido.estadoCambiado", {
    pedidoId: pedido.id,
    numeroMesa: pedido.numeroMesa,
    meseroId: pedido.meseroId,
    estadoAnterior: pedido.estado,
    estadoNuevo: datos.estado,
    usuarioId: usuario.id,
    fecha: fecha.toISOString(),
  });
}

// ------------------------------------------------------------------ consultas

/** Listado paginado con filtros. El mesero solo ve los suyos; caja y admin, todos. */
export async function listarPedidos(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasPedidos = dependenciasReales,
) {
  exigirRol(usuario, Rol.MESERO, Rol.CAJERO, Rol.ADMINISTRADOR);
  const filtro = validar(esquemaFiltroPedidos, entrada);

  const { pedidos, total } = await deps.repositorio.listar({
    meseroId: usuario.rol === Rol.MESERO ? usuario.id : undefined,
    id: filtro.id,
    numeroMesa: filtro.mesa,
    estado: filtro.estado,
    salto: (filtro.pagina - 1) * FILAS_POR_PAGINA,
    cantidad: FILAS_POR_PAGINA,
  });
  return {
    pedidos,
    total,
    filtro,
    totalPaginas: Math.max(1, Math.ceil(total / FILAS_POR_PAGINA)),
  };
}

/** Detalle con ítems, historial (con nombres) y los cambios que el usuario puede hacer. */
export async function obtenerPedido(
  usuario: UsuarioSesion,
  pedidoId: unknown,
  deps: DependenciasPedidos = dependenciasReales,
) {
  const { pedidoId: id } = validar(esquemaCambiarEstado.pick({ pedidoId: true }), { pedidoId });
  await pedidoVisible(usuario, id, deps);
  const pedido = await deps.repositorio.buscarPedido(id);
  if (!pedido) throw new ErrorNoEncontrado("El pedido no existe.");

  const cambios = await deps.repositorio.buscarCambios(id);
  const nombres = await deps.obtenerNombresDeUsuarios(cambios.map((cambio) => cambio.usuarioId));
  return {
    pedido,
    historial: cambios.map((cambio) => ({
      ...cambio,
      usuarioNombre: nombres.get(cambio.usuarioId) ?? `Usuario ${cambio.usuarioId}`,
    })),
    estadosPermitidos: estadosPermitidos(pedido, usuario),
    puedeEditarItems: puedeEditarItems(pedido, usuario),
  };
}

/** Cola de cocina: creados y en preparación, los más antiguos primero. */
export function colaCocina(usuario: UsuarioSesion, deps: DependenciasPedidos = dependenciasReales) {
  exigirRol(usuario, Rol.COCINA);
  return deps.repositorio.listarPorEstados([EstadoPedido.CREADO, EstadoPedido.EN_PREPARACION]);
}

/** Pedidos entregados que caja debe cobrar. */
export function pedidosPorCobrar(
  usuario: UsuarioSesion,
  deps: DependenciasPedidos = dependenciasReales,
) {
  exigirRol(usuario, Rol.CAJERO);
  return deps.repositorio.listarPorEstados([EstadoPedido.ENTREGADO]);
}

// ------------------------------------------------------------------ contratos

/** CONTRATO: estado actual de un pedido. Lo usa calificaciones. */
export async function obtenerEstadoPedido(
  pedidoId: number,
): Promise<{ id: number; estado: EstadoPedido } | null> {
  const pedido = await repositorio.buscarResumen(pedidoId);
  return pedido ? { id: pedido.id, estado: pedido.estado } : null;
}

/** Un pedido con la hora de cada paso del flujo (null si no llegó a ese estado). */
export interface ResumenPedido {
  pedidoId: number;
  numeroMesa: number;
  meseroId: number;
  meseroNombre: string;
  estado: EstadoPedido;
  total: string;
  creadoEn: Date;
  enPreparacionEn: Date | null;
  listoEn: Date | null;
  entregadoEn: Date | null;
  cobradoEn: Date | null;
  canceladoEn: Date | null;
}

/**
 * CONTRATO (reporte por mesero, frente B): pedidos creados en [desde, hasta),
 * de un mesero o de todos, con la hora de cada cambio de estado.
 *
 * No decide permisos: el servicio que lo usa comprueba quién puede ver qué
 * (el mesero solo lo suyo; el administrador, todo).
 */
export async function resumenDeServicio(
  filtro: { meseroId?: number; desde: Date; hasta: Date },
  deps: Pick<DependenciasPedidos, "repositorio"> = dependenciasReales,
): Promise<ResumenPedido[]> {
  if (!(filtro.desde < filtro.hasta)) return [];
  const filas = await deps.repositorio.listarResumen(filtro);
  return filas.map((fila) => {
    // Primera vez que el pedido llegó a cada estado.
    const cuando = (estado: EstadoPedido) =>
      fila.cambios.find((cambio) => cambio.estado === estado)?.fecha ?? null;
    return {
      pedidoId: fila.id,
      numeroMesa: fila.numeroMesa,
      meseroId: fila.meseroId,
      meseroNombre: fila.meseroNombre,
      estado: fila.estado,
      total: fila.total,
      creadoEn: fila.creadoEn,
      enPreparacionEn: cuando(EstadoPedido.EN_PREPARACION),
      listoEn: cuando(EstadoPedido.LISTO),
      entregadoEn: cuando(EstadoPedido.ENTREGADO),
      cobradoEn: cuando(EstadoPedido.COBRADO),
      canceladoEn: cuando(EstadoPedido.CANCELADO),
    };
  });
}

/** CONTRATO (reporte opcional, frente B): pedidos de un mesero en un rango [desde, hasta). */
export function pedidosDeMeseroEntreFechas(
  meseroId: number,
  desde: Date,
  hasta: Date,
): Promise<repositorio.PedidoGuardado[]> {
  return repositorio.listarDeMeseroEntreFechas(meseroId, desde, hasta);
}
