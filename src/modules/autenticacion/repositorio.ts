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

/** Primer usuario activo con ese rol. Lo usa el usuario falso de desarrollo. */
export function buscarPrimerUsuarioActivoPorRol(rol: Rol): Promise<UsuarioSesion | null> {
  return prisma().usuario.findFirst({
    where: { rol, activo: true },
    orderBy: { id: "asc" },
    select: camposSesion,
  });
}
