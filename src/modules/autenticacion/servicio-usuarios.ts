/**
 * Gestión de usuarios por el administrador: listar, cambiar rol y activar o
 * desactivar cuentas. Los usuarios se desactivan, nunca se borran, para no
 * perder su historial (pedidos, cambios de estado, mensajes).
 */
import { Rol } from "@/generated/prisma/enums";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido } from "@/lib/errores";
import { FILAS_POR_PAGINA } from "@/lib/pagina";
import { validar } from "@/lib/validacion";
import * as repositorio from "./repositorio";
import { cerrarTodasLasSesiones } from "./sesion";
import type { UsuarioSesion } from "./tipos";
import { esquemaCambiarActivo, esquemaCambiarRol, esquemaFiltroUsuarios } from "./validadores";

export interface DependenciasUsuarios {
  repositorio: Pick<
    typeof repositorio,
    "listarUsuarios" | "buscarUsuarioPorId" | "actualizarRol" | "actualizarActivo"
  >;
  cerrarTodasLasSesiones: typeof cerrarTodasLasSesiones;
  desconectarUsuario: (usuarioId: number) => void | Promise<void>;
}

const dependenciasReales: DependenciasUsuarios = {
  repositorio,
  cerrarTodasLasSesiones,
  desconectarUsuario: async (usuarioId) => {
    // Carga diferida, igual que en servicio.ts, para evitar un ciclo al arrancar.
    const { desconectarUsuario } = await import("@/modules/tiempo-real");
    desconectarUsuario(usuarioId);
  },
};

export type { UsuarioListado } from "./repositorio";

function exigirAdministrador(usuario: UsuarioSesion): void {
  if (usuario.rol !== Rol.ADMINISTRADOR) throw new ErrorProhibido();
}

/** Listado paginado de usuarios con búsqueda por nombre o correo. */
export async function listarUsuarios(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasUsuarios = dependenciasReales,
) {
  exigirAdministrador(usuario);
  const filtro = validar(esquemaFiltroUsuarios, entrada);
  const { usuarios, total } = await deps.repositorio.listarUsuarios({
    texto: filtro.texto,
    salto: (filtro.pagina - 1) * FILAS_POR_PAGINA,
    cantidad: FILAS_POR_PAGINA,
  });
  return {
    usuarios,
    total,
    filtro,
    totalPaginas: Math.max(1, Math.ceil(total / FILAS_POR_PAGINA)),
  };
}

async function usuarioExistente(id: number, deps: DependenciasUsuarios) {
  const encontrado = await deps.repositorio.buscarUsuarioPorId(id);
  if (!encontrado) throw new ErrorNoEncontrado("El usuario no existe.");
  return encontrado;
}

/**
 * Cambia el rol de un usuario. Cierra sus sesiones para que el rol nuevo se
 * aplique de inmediato (al volver a entrar recibe los permisos nuevos).
 */
export async function cambiarRol(
  admin: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasUsuarios = dependenciasReales,
): Promise<void> {
  exigirAdministrador(admin);
  const datos = validar(esquemaCambiarRol, entrada);
  if (datos.usuarioId === admin.id) {
    throw new ErrorConflicto("No puedes cambiar tu propio rol.");
  }
  const usuario = await usuarioExistente(datos.usuarioId, deps);
  if (usuario.rol === datos.rol) return;

  await deps.repositorio.actualizarRol(usuario.id, datos.rol);
  await deps.cerrarTodasLasSesiones(usuario.id);
  await deps.desconectarUsuario(usuario.id);
}

/** Activa o desactiva una cuenta. Al desactivarla se cortan sus sesiones y conexiones. */
export async function cambiarActivo(
  admin: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasUsuarios = dependenciasReales,
): Promise<void> {
  exigirAdministrador(admin);
  const datos = validar(esquemaCambiarActivo, entrada);
  if (datos.usuarioId === admin.id) {
    throw new ErrorConflicto("No puedes desactivar tu propia cuenta.");
  }
  const usuario = await usuarioExistente(datos.usuarioId, deps);
  if (usuario.activo === datos.activo) return;

  await deps.repositorio.actualizarActivo(usuario.id, datos.activo);
  if (!datos.activo) {
    await deps.cerrarTodasLasSesiones(usuario.id);
    await deps.desconectarUsuario(usuario.id);
  }
}
