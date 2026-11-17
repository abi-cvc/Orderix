/**
 * CONTRATO: eventos en tiempo real que publican otros módulos.
 *
 * El nombre del evento es el mismo en el servidor y en el navegador
 * (socket.on("pedido.creado", ...)). Los datos son solo lo necesario para
 * actualizar la pantalla; si hace falta más, la pantalla lo pide al servidor.
 *
 * Archivo seguro para el navegador: solo tipos y constantes, sin base de datos.
 */
import type { EstadoPedido } from "@/generated/prisma/enums";

export interface EventosTiempoReal {
  /** El mesero envió un pedido nuevo. Lo recibe cocina. */
  "pedido.creado": {
    pedidoId: number;
    numeroMesa: number;
    meseroId: number;
    meseroNombre: string;
    cantidadItems: number;
    tieneAlergias: boolean;
    creadoEn: string; // ISO 8601
  };

  /** Cambió el estado de un pedido. Lo reciben cocina, caja y el mesero dueño. */
  "pedido.estadoCambiado": {
    pedidoId: number;
    numeroMesa: number;
    meseroId: number;
    estadoAnterior: EstadoPedido;
    estadoNuevo: EstadoPedido;
    usuarioId: number;
    fecha: string; // ISO 8601
  };

  /** Se agregó o cambió una alergia en un pedido ya enviado. Lo recibe cocina como alerta. */
  "pedido.alergiaAgregada": {
    pedidoId: number;
    numeroMesa: number;
    itemId: number;
    nombreProducto: string;
    alergias: string;
  };

  /** Nuevo mensaje en el chat. */
  "chat:mensaje": {
    id: number;
    salaId: number;
    autorId: number;
    autorNombre: string;
    texto: string;
    enviadoEn: Date | string;
  };

  /** Lista actualizada de usuarios conectados al chat. */
  "chat:conectados": {
    id: number;
    nombre: string;
  }[];
}

export type TipoEvento = keyof EventosTiempoReal;

/** Salas de Socket.IO a las que se une cada conexión al autenticarse (paso 6). */
export const salaDeRol = (rol: string) => `rol:${rol}`;
export const salaDeUsuario = (usuarioId: number) => `usuario:${usuarioId}`;
