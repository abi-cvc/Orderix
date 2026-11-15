/**
 * Repositorio de autenticacion: el ÚNICO archivo del módulo que toca la base.
 * Tablas propias: usuarios, sesiones, tokens_recuperacion.
 *
 * Frente A (Alejandro): aquí van las consultas de registro, inicio de sesión,
 * sesiones y recuperación de clave.
 */
import type { Rol } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { UsuarioSesion } from "./tipos";

const camposSesion = { id: true, nombre: true, rol: true } as const;

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
