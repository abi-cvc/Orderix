/**
 * CONTRATO: publicarEvento(tipo, datos).
 *
 * Es el ÚNICO punto por donde sale un evento en tiempo real. Los demás módulos
 * no conocen Socket.IO: solo llaman a esta función. En el segundo bimestre,
 * cuando tiempo real sea otro servicio, solo cambia este archivo (por ejemplo,
 * para publicar en una cola en lugar de emitir directo).
 */
import type { Server } from "socket.io";
import { Rol } from "@/generated/prisma/enums";
import { salaDeRol, salaDeUsuario, type EventosTiempoReal, type TipoEvento } from "./eventos";

// server.ts (cargado con tsx) y el código de Next (empaquetado aparte) son dos
// copias distintas de este módulo dentro del mismo proceso. Por eso el servidor
// de Socket.IO se guarda en globalThis y no en una variable del módulo.
const globalTiempoReal = globalThis as unknown as { servidorSocket?: Server };

/** Lo llama server.ts una sola vez, al crear Socket.IO. */
export function registrarServidorSocket(io: Server): void {
  globalTiempoReal.servidorSocket = io;
}

/** A qué salas va cada tipo de evento. */
function destinatarios<T extends TipoEvento>(tipo: T, datos: EventosTiempoReal[T]): string[] {
  switch (tipo) {
    case "pedido.creado":
    case "pedido.alergiaAgregada":
      return [salaDeRol(Rol.COCINA)];
    case "pedido.estadoCambiado": {
      const { meseroId } = datos as EventosTiempoReal["pedido.estadoCambiado"];
      return [salaDeRol(Rol.COCINA), salaDeRol(Rol.CAJERO), salaDeUsuario(meseroId)];
    }
    default:
      return [];
  }
}

/**
 * Publica un evento a las pantallas que deben recibirlo.
 * Nunca lanza: si Socket.IO no está listo, el pedido igual se guarda; solo se
 * pierde el aviso (y la pantalla lo verá al recargar).
 */
export function publicarEvento<T extends TipoEvento>(tipo: T, datos: EventosTiempoReal[T]): void {
  const io = globalTiempoReal.servidorSocket;
  if (!io) {
    console.warn(`[tiempo-real] Socket.IO no está listo; se omite el evento ${tipo}`);
    return;
  }
  const salas = destinatarios(tipo, datos);
  if (salas.length > 0) io.to(salas).emit(tipo, datos);
}
