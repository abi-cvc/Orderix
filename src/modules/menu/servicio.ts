/**
 * Servicio de menu.
 *
 * Frente B (Ricardo): aquí va el CRUD de productos (solo ADMINISTRADOR escribe),
 * siguiendo el patrón de calificaciones/servicio.ts.
 *
 * Las dos funciones de abajo son CONTRATOS que usa el módulo pedidos.
 */
import * as repositorio from "./repositorio";
import { Rol } from "@/generated/prisma/enums";
import { ErrorNoEncontrado, ErrorProhibido } from "@/lib/errores";
import { FILAS_POR_PAGINA } from "@/lib/pagina";
import { validar } from "@/lib/validacion";
import type { UsuarioSesion } from "@/modules/autenticacion";
import {
  esquemaCrearProducto,
  esquemaEditarProducto,
  esquemaFiltroProductos,
  esquemaProductoId,
} from "./validadores";

export type { ProductoGuardado } from "./repositorio";

function exigirAdministrador(usuario: UsuarioSesion): void {
  if (usuario.rol !== Rol.ADMINISTRADOR) throw new ErrorProhibido();
}

/**
 * CONTRATO (pedidos): productos con esos ids, para copiar nombre y precio al
 * crear un pedido. Los que no existen simplemente no vienen en la respuesta.
 */
export function obtenerProductosParaPedido(
  ids: number[],
): Promise<repositorio.ProductoParaPedido[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return repositorio.buscarPorIds([...new Set(ids)]);
}

/** CONTRATO (pedidos): productos disponibles para el formulario de nuevo pedido. */
export function listarProductosDisponibles(): Promise<repositorio.ProductoParaPedido[]> {
  return repositorio.listarDisponibles();
}

export async function listarProductos(usuario: UsuarioSesion, entrada: unknown) {
  exigirAdministrador(usuario);
  const filtro = validar(esquemaFiltroProductos, entrada);
  const { productos, total } = await repositorio.listar({
    nombre: filtro.nombre,
    categoria: filtro.categoria,
    disponible: filtro.disponible,
    salto: (filtro.pagina - 1) * FILAS_POR_PAGINA,
    cantidad: FILAS_POR_PAGINA,
  });
  return {
    productos,
    total,
    filtro,
    totalPaginas: Math.max(1, Math.ceil(total / FILAS_POR_PAGINA)),
  };
}

export async function obtenerProducto(usuario: UsuarioSesion, entrada: unknown) {
  exigirAdministrador(usuario);
  const { id } = validar(esquemaProductoId, { id: entrada });
  const producto = await repositorio.buscarPorId(id);
  if (!producto) throw new ErrorNoEncontrado("El producto no existe.");
  return producto;
}

export async function crearProducto(
  usuario: UsuarioSesion,
  entrada: unknown,
): Promise<repositorio.ProductoGuardado> {
  exigirAdministrador(usuario);
  const datos = validar(esquemaCrearProducto, entrada);
  return repositorio.crear(datos);
}

export async function editarProducto(
  usuario: UsuarioSesion,
  entrada: unknown,
): Promise<repositorio.ProductoGuardado> {
  exigirAdministrador(usuario);
  const datos = validar(esquemaEditarProducto, entrada);
  const existente = await repositorio.buscarPorId(datos.id);
  if (!existente) throw new ErrorNoEncontrado("El producto no existe.");
  const { id, ...cambios } = datos;
  return repositorio.editar(id, cambios);
}

export async function desactivarProducto(usuario: UsuarioSesion, entrada: unknown): Promise<void> {
  exigirAdministrador(usuario);
  const { id } = validar(esquemaProductoId, { id: entrada });
  const existente = await repositorio.buscarPorId(id);
  if (!existente) throw new ErrorNoEncontrado("El producto no existe.");
  await repositorio.desactivar(id);
}

export async function eliminarProducto(usuario: UsuarioSesion, entrada: unknown): Promise<void> {
  exigirAdministrador(usuario);
  const { id } = validar(esquemaProductoId, { id: entrada });
  const existente = await repositorio.buscarPorId(id);
  if (!existente) throw new ErrorNoEncontrado("El producto no existe.");
  await repositorio.eliminar(id);
}
