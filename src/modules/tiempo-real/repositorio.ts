/**
 * Repositorio de tiempo-real: el ÚNICO archivo del módulo que toca la base de datos.
 * Tablas propias: salas, mensajes.
 *
 * Reglas para cualquier repositorio:
 * - Solo consulta las tablas de su módulo.
 * - Devuelve objetos simples (con `select`), nunca el modelo completo si no hace falta.
 * - No valida ni decide permisos: eso es responsabilidad del servicio.
 */
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const LIMITE_HISTORIAL_SALA = 50;

const camposSala = {
  id: true,
  nombre: true,
} as const;

const camposMensaje = {
  id: true,
  salaId: true,
  autorId: true,
  autorNombre: true,
  texto: true,
  enviadoEn: true,
} as const;

export type SalaGuardada = Prisma.SalaGetPayload<{ select: typeof camposSala }>;
export type MensajeGuardado = Prisma.MensajeGetPayload<{ select: typeof camposMensaje }>;

/**
 * Busca una sala por su nombre único (p. ej. "general").
 */
export function buscarSalaPorNombre(nombre: string): Promise<SalaGuardada | null> {
  return prisma().sala.findUnique({
    where: { nombre },
    select: camposSala,
  });
}

/**
 * Guarda un mensaje en una sala asignando autor y texto validados.
 */
export function guardarMensaje(datos: {
  salaId: number;
  autorId: number;
  autorNombre: string;
  texto: string;
}): Promise<MensajeGuardado> {
  return prisma().mensaje.create({
    data: datos,
    select: camposMensaje,
  });
}

/**
 * Obtiene los últimos 50 mensajes de una sala ordenados por fecha.
 * Usa el índice existente por (salaId, enviadoEn) para traer los más recientes
 * y los retorna en orden cronológico ascendente para pintarlos de arriba hacia abajo.
 */
export async function obtenerHistorialDeSala(salaId: number): Promise<MensajeGuardado[]> {
  const mensajesDescendentes = await prisma().mensaje.findMany({
    where: { salaId },
    orderBy: { enviadoEn: "desc" },
    take: LIMITE_HISTORIAL_SALA,
    select: camposMensaje,
  });

  return mensajesDescendentes.reverse();
}
