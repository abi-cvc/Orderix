/**
 * Repositorio de autenticacion: el ÚNICO archivo del módulo que toca la base.
 * Tablas propias: usuarios, sesiones, tokens_recuperacion.
 *
 * Frente A (Alejandro): aquí van las consultas de registro, inicio de sesión,
 * sesiones y recuperación de clave.
 */
import type { Rol } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { ErrorConflicto } from "@/lib/errores";
import { prisma } from "@/lib/prisma";
import type { UsuarioSesion } from "./tipos";

const camposSesion = { id: true, nombre: true, rol: true } as const;

export function buscarUsuarioPorCorreo(
  correo: string,
): Promise<(UsuarioSesion & { hashClave: string; activo: boolean }) | null> {
  return prisma().usuario.findUnique({
    where: { correo },
    select: { ...camposSesion, hashClave: true, activo: true },
  });
}

export async function crearUsuario(datos: {
  nombre: string;
  correo: string;
  hashClave: string;
  rol: Rol;
}): Promise<UsuarioSesion> {
  try {
    return await prisma().usuario.create({ data: datos, select: camposSesion });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ErrorConflicto("Ya existe una cuenta con ese correo.");
    }
    throw error;
  }
}

export async function crearTokenRecuperacion(datos: {
  usuarioId: number;
  hashToken: string;
  caducaEn: Date;
}): Promise<void> {
  await prisma().tokenRecuperacion.create({ data: datos });
}

/** Reclama el token con una actualización condicional para impedir su reutilización concurrente. */
export function consumirTokenYCambiarClave(datos: {
  hashToken: string;
  hashClave: string;
  ahora: Date;
}): Promise<number | null> {
  return prisma().$transaction(async (tx) => {
    const token = await tx.tokenRecuperacion.findUnique({
      where: { hashToken: datos.hashToken },
      select: { id: true, usuarioId: true },
    });
    if (!token) return null;
    const resultado = await tx.tokenRecuperacion.updateMany({
      where: {
        id: token.id,
        usado: false,
        caducaEn: { gt: datos.ahora },
        usuario: { activo: true },
      },
      data: { usado: true },
    });
    if (resultado.count !== 1) return null;
    await tx.usuario.update({
      where: { id: token.usuarioId },
      data: { hashClave: datos.hashClave },
    });
    // La revocación queda confirmada junto con la clave, incluso si luego falla
    // la llamada del servicio al contrato público cerrarTodasLasSesiones.
    await tx.sesion.deleteMany({ where: { usuarioId: token.usuarioId } });
    return token.usuarioId;
  });
}

// ---------------------------------------------------------------- sesiones

/** Guarda una sesión nueva y aprovecha para borrar las vencidas del mismo usuario. */
export async function crearSesion(datos: {
  id: string;
  usuarioId: number;
  expiraEn: Date;
}): Promise<void> {
  await prisma().$transaction([
    prisma().sesion.deleteMany({
      where: { usuarioId: datos.usuarioId, expiraEn: { lt: new Date() } },
    }),
    prisma().sesion.create({ data: datos }),
  ]);
}

/** Sesión por su id (hash) con los datos del usuario necesarios para autorizar. */
export function buscarSesionConUsuario(id: string): Promise<{
  expiraEn: Date;
  usuario: UsuarioSesion & { activo: boolean };
} | null> {
  return prisma().sesion.findUnique({
    where: { id },
    select: { expiraEn: true, usuario: { select: { ...camposSesion, activo: true } } },
  });
}

export async function borrarSesion(id: string): Promise<void> {
  await prisma().sesion.deleteMany({ where: { id } });
}

export async function borrarSesionesDeUsuario(usuarioId: number): Promise<void> {
  await prisma().sesion.deleteMany({ where: { usuarioId } });
}

// ---------------------------------------------------------------- usuarios

/** Primer usuario activo con ese rol. Lo usa el usuario falso de desarrollo. */
export function buscarPrimerUsuarioActivoPorRol(rol: Rol): Promise<UsuarioSesion | null> {
  return prisma().usuario.findFirst({
    where: { rol, activo: true },
    orderBy: { id: "asc" },
    select: camposSesion,
  });
}

/** Nombres de varios usuarios (para mostrar quién hizo cada cambio). */
export function buscarNombres(ids: number[]): Promise<{ id: number; nombre: string }[]> {
  return prisma().usuario.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
  });
}

// ------------------------------------------------- gestión de usuarios (admin)

export interface UsuarioListado {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  creadoEn: Date;
}

const camposListado = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  creadoEn: true,
} as const;

/** Una página de usuarios, buscando por nombre o correo. Orden fijo para paginar estable. */
export async function listarUsuarios(consulta: {
  texto?: string;
  salto: number;
  cantidad: number;
}): Promise<{ usuarios: UsuarioListado[]; total: number }> {
  const where = consulta.texto
    ? {
        OR: [
          { nombre: { contains: consulta.texto, mode: "insensitive" as const } },
          { correo: { contains: consulta.texto, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [usuarios, total] = await prisma().$transaction([
    prisma().usuario.findMany({
      where,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: consulta.salto,
      take: consulta.cantidad,
      select: camposListado,
    }),
    prisma().usuario.count({ where }),
  ]);
  return { usuarios, total };
}

export function buscarUsuarioPorId(id: number): Promise<UsuarioListado | null> {
  return prisma().usuario.findUnique({ where: { id }, select: camposListado });
}

export async function actualizarRol(id: number, rol: Rol): Promise<void> {
  await prisma().usuario.update({ where: { id }, data: { rol } });
}

export async function actualizarActivo(id: number, activo: boolean): Promise<void> {
  await prisma().usuario.update({ where: { id }, data: { activo } });
}
