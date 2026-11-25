import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { ErrorProhibido } from "@/lib/errores";
import { validar } from "@/lib/validacion";
import type { UsuarioSesion } from "@/modules/autenticacion";
import { calificacionesDePedidos } from "@/modules/calificaciones";
import type { CalificacionGuardada } from "@/modules/calificaciones";
import { resumenDeServicio } from "@/modules/pedidos";
import type { ResumenPedido } from "@/modules/pedidos";
import { esquemaReporteMeseros } from "./validadores";

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

export interface FilaReporteMesero {
  meseroId: number;
  meseroNombre: string;
  pedidosAtendidos: number;
  pedidosCobrados: number;
  pedidosCancelados: number;
  totalVendido: string;
  tiempoPromedioCocinaMinutos: number | null;
  tiempoPromedioEntregaMinutos: number | null;
  calificacionPromedio: number | null;
}

export interface ReporteMeseros {
  desde: string;
  hasta: string;
  filas: FilaReporteMesero[];
}

export interface DependenciasReporteMeseros {
  resumenDeServicio: typeof resumenDeServicio;
  calificacionesDePedidos: typeof calificacionesDePedidos;
}

const dependenciasReales: DependenciasReporteMeseros = {
  resumenDeServicio,
  calificacionesDePedidos,
};

interface AcumuladoMesero {
  meseroId: number;
  meseroNombre: string;
  pedidosAtendidos: number;
  pedidosCobrados: number;
  pedidosCancelados: number;
  totalVendidoCentavos: number;
  sumaCocinaMilisegundos: number;
  cantidadTiemposCocina: number;
  sumaEntregaMilisegundos: number;
  cantidadTiemposEntrega: number;
  sumaCalificaciones: number;
  cantidadCalificaciones: number;
}

function fechaInicioEcuador(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000-05:00`);
}

function fechaFinExclusivaEcuador(fecha: string): Date {
  return new Date(fechaInicioEcuador(fecha).getTime() + MILISEGUNDOS_POR_DIA);
}

function nuevoAcumulado(meseroId: number, meseroNombre: string): AcumuladoMesero {
  return {
    meseroId,
    meseroNombre,
    pedidosAtendidos: 0,
    pedidosCobrados: 0,
    pedidosCancelados: 0,
    totalVendidoCentavos: 0,
    sumaCocinaMilisegundos: 0,
    cantidadTiemposCocina: 0,
    sumaEntregaMilisegundos: 0,
    cantidadTiemposEntrega: 0,
    sumaCalificaciones: 0,
    cantidadCalificaciones: 0,
  };
}

function acumularDuracion(inicio: Date, fin: Date | null, sumar: (duracion: number) => void): void {
  if (!fin) return;
  const duracion = fin.getTime() - inicio.getTime();
  if (Number.isFinite(duracion) && duracion >= 0) sumar(duracion);
}

function puntajesPorPedido(calificaciones: CalificacionGuardada[]): Map<number, number> {
  return new Map(
    calificaciones.map((calificacion) => [calificacion.pedidoId, calificacion.puntaje]),
  );
}

function resumirFila(acumulado: AcumuladoMesero): FilaReporteMesero {
  const promedio = (suma: number, cantidad: number) => (cantidad === 0 ? null : suma / cantidad);
  const cocina = promedio(acumulado.sumaCocinaMilisegundos, acumulado.cantidadTiemposCocina);
  const entrega = promedio(acumulado.sumaEntregaMilisegundos, acumulado.cantidadTiemposEntrega);

  return {
    meseroId: acumulado.meseroId,
    meseroNombre: acumulado.meseroNombre,
    pedidosAtendidos: acumulado.pedidosAtendidos,
    pedidosCobrados: acumulado.pedidosCobrados,
    pedidosCancelados: acumulado.pedidosCancelados,
    totalVendido: (acumulado.totalVendidoCentavos / 100).toFixed(2),
    tiempoPromedioCocinaMinutos: cocina === null ? null : cocina / 60_000,
    tiempoPromedioEntregaMinutos: entrega === null ? null : entrega / 60_000,
    calificacionPromedio: promedio(acumulado.sumaCalificaciones, acumulado.cantidadCalificaciones),
  };
}

function acumularPedidos(
  pedidos: ResumenPedido[],
  calificaciones: Map<number, number>,
  acumulados: Map<number, AcumuladoMesero>,
): void {
  for (const pedido of pedidos) {
    let acumulado = acumulados.get(pedido.meseroId);
    if (!acumulado) {
      acumulado = nuevoAcumulado(pedido.meseroId, pedido.meseroNombre);
      acumulados.set(pedido.meseroId, acumulado);
    }

    acumulado.pedidosAtendidos += 1;
    const cancelado = pedido.estado === EstadoPedido.CANCELADO || pedido.canceladoEn !== null;
    if (cancelado) {
      acumulado.pedidosCancelados += 1;
    }

    const cobrado =
      !cancelado && pedido.estado === EstadoPedido.COBRADO && pedido.cobradoEn !== null;
    if (cobrado) {
      acumulado.pedidosCobrados += 1;
      const centavos = Math.round(Number(pedido.total) * 100);
      if (Number.isFinite(centavos)) acumulado.totalVendidoCentavos += centavos;
    }

    if (pedido.listoEn) {
      acumularDuracion(pedido.creadoEn, pedido.listoEn, (duracion) => {
        acumulado!.sumaCocinaMilisegundos += duracion;
        acumulado!.cantidadTiemposCocina += 1;
      });
    }
    if (pedido.listoEn) {
      acumularDuracion(pedido.listoEn, pedido.entregadoEn, (duracion) => {
        acumulado!.sumaEntregaMilisegundos += duracion;
        acumulado!.cantidadTiemposEntrega += 1;
      });
    }

    const puntaje = calificaciones.get(pedido.pedidoId);
    if (puntaje !== undefined) {
      acumulado.sumaCalificaciones += puntaje;
      acumulado.cantidadCalificaciones += 1;
    }
  }
}

/**
 * Genera los indicadores del reporte. El meseroId siempre procede de la sesión;
 * cualquier identificador enviado por el cliente se ignora.
 */
export async function obtenerReporteMeseros(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasReporteMeseros = dependenciasReales,
): Promise<ReporteMeseros> {
  if (usuario.rol !== Rol.ADMINISTRADOR && usuario.rol !== Rol.MESERO) {
    throw new ErrorProhibido("Solo meseros y administradores pueden consultar este reporte.");
  }

  const filtro = validar(esquemaReporteMeseros, entrada);
  const pedidos = await deps.resumenDeServicio({
    ...(usuario.rol === Rol.MESERO ? { meseroId: usuario.id } : {}),
    desde: fechaInicioEcuador(filtro.desde),
    hasta: fechaFinExclusivaEcuador(filtro.hasta),
  });
  const calificaciones = await deps.calificacionesDePedidos(
    pedidos.map((pedido) => pedido.pedidoId),
  );
  const acumulados = new Map<number, AcumuladoMesero>();

  if (usuario.rol === Rol.MESERO) {
    acumulados.set(usuario.id, nuevoAcumulado(usuario.id, usuario.nombre));
  }
  acumularPedidos(pedidos, puntajesPorPedido(calificaciones), acumulados);

  return {
    desde: filtro.desde,
    hasta: filtro.hasta,
    filas: [...acumulados.values()]
      .sort((a, b) => a.meseroNombre.localeCompare(b.meseroNombre, "es"))
      .map(resumirFila),
  };
}
