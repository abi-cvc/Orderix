import assert from "node:assert/strict";
import { test } from "node:test";
import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { ErrorProhibido, ErrorValidacion } from "@/lib/errores";
import type { UsuarioSesion } from "@/modules/autenticacion";
import type { CalificacionGuardada } from "@/modules/calificaciones";
import type { ResumenPedido } from "@/modules/pedidos";
import { obtenerReporteMeseros, type DependenciasReporteMeseros } from "./servicio";

const administrador: UsuarioSesion = { id: 90, nombre: "Andrea", rol: Rol.ADMINISTRADOR };
const meseroUno: UsuarioSesion = { id: 1, nombre: "Lucía", rol: Rol.MESERO };
const meseroDos: UsuarioSesion = { id: 2, nombre: "Carlos", rol: Rol.MESERO };
const cajero: UsuarioSesion = { id: 3, nombre: "Sofía", rol: Rol.CAJERO };
const desde = new Date("2026-01-01T05:00:00.000Z");
const hasta = new Date("2026-02-01T05:00:00.000Z");

function pedido(
  cambios: Partial<ResumenPedido> & Pick<ResumenPedido, "pedidoId" | "meseroId" | "meseroNombre">,
): ResumenPedido {
  const { pedidoId, meseroId, meseroNombre, ...resto } = cambios;
  return {
    pedidoId,
    numeroMesa: 1,
    meseroId,
    meseroNombre,
    estado: EstadoPedido.COBRADO,
    total: "10.10",
    creadoEn: new Date("2026-01-02T10:00:00.000Z"),
    enPreparacionEn: null,
    listoEn: null,
    entregadoEn: null,
    cobradoEn: null,
    canceladoEn: null,
    ...resto,
  };
}

function crearEntorno(pedidos: ResumenPedido[], calificaciones: CalificacionGuardada[] = []) {
  const filtros: { meseroId?: number; desde: Date; hasta: Date }[] = [];
  const idsConsultados: number[][] = [];
  const deps: DependenciasReporteMeseros = {
    async resumenDeServicio(filtro) {
      filtros.push(filtro);
      return filtro.meseroId === undefined
        ? pedidos
        : pedidos.filter((fila) => fila.meseroId === filtro.meseroId);
    },
    async calificacionesDePedidos(ids) {
      idsConsultados.push(ids);
      return calificaciones.filter((fila) => ids.includes(fila.pedidoId));
    },
  };
  return { deps, filtros, idsConsultados };
}

function calificacion(pedidoId: number, puntaje: number): CalificacionGuardada {
  return { id: pedidoId, pedidoId, puntaje, fecha: new Date("2026-01-03T00:00:00Z") };
}

test("el administrador consulta todos los meseros del período", async () => {
  const entorno = crearEntorno([
    pedido({ pedidoId: 10, meseroId: 1, meseroNombre: "Lucía" }),
    pedido({ pedidoId: 20, meseroId: 2, meseroNombre: "Carlos" }),
  ]);

  const reporte = await obtenerReporteMeseros(
    administrador,
    { desde: "2026-01-01", hasta: "2026-01-31" },
    entorno.deps,
  );

  assert.deepEqual(
    reporte.filas.map((fila) => fila.meseroId),
    [2, 1],
  );
  assert.equal(entorno.filtros[0]?.meseroId, undefined);
  assert.deepEqual(
    reporte.filas.map((fila) => fila.meseroNombre),
    ["Carlos", "Lucía"],
  );
});

test("el mesero queda limitado a su id aunque envíe el de otro usuario", async () => {
  const entorno = crearEntorno([
    pedido({ pedidoId: 10, meseroId: 1, meseroNombre: "Lucía" }),
    pedido({ pedidoId: 20, meseroId: 2, meseroNombre: "Carlos" }),
  ]);

  const reporte = await obtenerReporteMeseros(
    meseroUno,
    { desde: "2026-01-01", hasta: "2026-01-31", meseroId: 2 },
    entorno.deps,
  );

  assert.equal(entorno.filtros[0]?.meseroId, meseroUno.id);
  assert.deepEqual(
    reporte.filas.map((fila) => fila.meseroId),
    [meseroUno.id],
  );
});

test("rechaza usuarios que no son meseros ni administradores", async () => {
  const entorno = crearEntorno([]);
  await assert.rejects(
    obtenerReporteMeseros(cajero, { desde: "2026-01-01", hasta: "2026-01-31" }, entorno.deps),
    ErrorProhibido,
  );
  assert.equal(entorno.filtros.length, 0);
});

test("calcula conteos, venta en centavos, promedios y calificaciones", async () => {
  const pedidos = [
    pedido({
      pedidoId: 1,
      meseroId: 1,
      meseroNombre: "Lucía",
      total: "12.35",
      estado: EstadoPedido.COBRADO,
      creadoEn: new Date("2026-01-02T10:00:00Z"),
      listoEn: new Date("2026-01-02T10:20:00Z"),
      entregadoEn: new Date("2026-01-02T10:25:00Z"),
      cobradoEn: new Date("2026-01-02T10:30:00Z"),
    }),
    pedido({
      pedidoId: 2,
      meseroId: 1,
      meseroNombre: "Lucía",
      total: "0.10",
      estado: EstadoPedido.COBRADO,
      creadoEn: new Date("2026-01-03T10:00:00Z"),
      listoEn: new Date("2026-01-03T10:40:00Z"),
      entregadoEn: new Date("2026-01-03T10:50:00Z"),
      cobradoEn: new Date("2026-01-03T10:55:00Z"),
    }),
    pedido({
      pedidoId: 3,
      meseroId: 1,
      meseroNombre: "Lucía",
      total: "99.99",
      estado: EstadoPedido.CANCELADO,
      canceladoEn: new Date("2026-01-04T10:30:00Z"),
    }),
    pedido({
      pedidoId: 4,
      meseroId: 1,
      meseroNombre: "Lucía",
      total: "7.00",
      estado: EstadoPedido.ENTREGADO,
    }),
  ];
  const entorno = crearEntorno(pedidos, [calificacion(1, 4), calificacion(2, 5)]);

  const reporte = await obtenerReporteMeseros(
    meseroUno,
    { desde: "2026-01-01", hasta: "2026-01-31" },
    entorno.deps,
  );
  const fila = reporte.filas[0]!;

  assert.equal(fila.pedidosAtendidos, 4);
  assert.equal(fila.pedidosCobrados, 2);
  assert.equal(fila.pedidosCancelados, 1);
  assert.equal(fila.totalVendido, "12.45");
  assert.equal(fila.tiempoPromedioCocinaMinutos, 30);
  assert.equal(fila.tiempoPromedioEntregaMinutos, 7.5);
  assert.equal(fila.calificacionPromedio, 4.5);
  assert.deepEqual(entorno.idsConsultados, [[1, 2, 3, 4]]);
});

test("historial incompleto y duración negativa no contaminan promedios", async () => {
  const entorno = crearEntorno([
    pedido({
      pedidoId: 1,
      meseroId: 1,
      meseroNombre: "Lucía",
      estado: EstadoPedido.COBRADO,
      creadoEn: new Date("2026-01-02T10:00:00Z"),
      listoEn: new Date("2026-01-02T10:10:00Z"),
      entregadoEn: new Date("2026-01-02T10:15:00Z"),
      cobradoEn: new Date("2026-01-02T10:20:00Z"),
    }),
    pedido({
      pedidoId: 2,
      meseroId: 1,
      meseroNombre: "Lucía",
      estado: EstadoPedido.COBRADO,
      creadoEn: new Date("2026-01-02T10:00:00Z"),
      listoEn: null,
      entregadoEn: new Date("2026-01-02T10:15:00Z"),
      cobradoEn: new Date("2026-01-02T10:20:00Z"),
    }),
    pedido({
      pedidoId: 3,
      meseroId: 1,
      meseroNombre: "Lucía",
      estado: EstadoPedido.ENTREGADO,
      creadoEn: new Date("2026-01-02T10:20:00Z"),
      listoEn: new Date("2026-01-02T10:10:00Z"),
      entregadoEn: new Date("2026-01-02T10:15:00Z"),
    }),
  ]);

  const reporte = await obtenerReporteMeseros(
    meseroUno,
    { desde: "2026-01-01", hasta: "2026-01-31" },
    entorno.deps,
  );
  assert.equal(reporte.filas[0]?.tiempoPromedioCocinaMinutos, 10);
  assert.equal(reporte.filas[0]?.tiempoPromedioEntregaMinutos, 5);
});

test("pedidos no calificados no afectan el promedio y mesero sin actividad recibe ceros", async () => {
  const entorno = crearEntorno(
    [
      pedido({ pedidoId: 1, meseroId: 1, meseroNombre: "Lucía" }),
      pedido({ pedidoId: 2, meseroId: 1, meseroNombre: "Lucía" }),
    ],
    [calificacion(1, 4)],
  );

  const reporte = await obtenerReporteMeseros(
    meseroUno,
    { desde: "2026-01-01", hasta: "2026-01-31" },
    entorno.deps,
  );
  assert.equal(reporte.filas[0]?.calificacionPromedio, 4);

  const sinPedidos = crearEntorno([]);
  const vacio = await obtenerReporteMeseros(
    meseroDos,
    { desde: "2026-01-01", hasta: "2026-01-31" },
    sinPedidos.deps,
  );
  assert.deepEqual(vacio.filas, [
    {
      meseroId: meseroDos.id,
      meseroNombre: meseroDos.nombre,
      pedidosAtendidos: 0,
      pedidosCobrados: 0,
      pedidosCancelados: 0,
      totalVendido: "0.00",
      tiempoPromedioCocinaMinutos: null,
      tiempoPromedioEntregaMinutos: null,
      calificacionPromedio: null,
    },
  ]);
});

test("valida las fechas y consulta el rango completo en hora de Ecuador", async () => {
  const entorno = crearEntorno([]);

  await assert.rejects(
    obtenerReporteMeseros(
      administrador,
      { desde: "2026-02-01", hasta: "2026-01-31" },
      entorno.deps,
    ),
    ErrorValidacion,
  );
  await assert.rejects(
    obtenerReporteMeseros(
      administrador,
      { desde: "2026-02-30", hasta: "2026-03-01" },
      entorno.deps,
    ),
    ErrorValidacion,
  );
  assert.equal(entorno.filtros.length, 0);

  await obtenerReporteMeseros(
    administrador,
    { desde: "2026-01-01", hasta: "2026-01-31" },
    entorno.deps,
  );
  assert.equal(entorno.filtros[0]?.desde.toISOString(), desde.toISOString());
  assert.equal(entorno.filtros[0]?.hasta.toISOString(), hasta.toISOString());
});

test("solo suma la venta de pedidos cobrados y excluye cancelados aunque tengan cobro", async () => {
  const entorno = crearEntorno([
    pedido({
      pedidoId: 1,
      meseroId: 1,
      meseroNombre: "Lucía",
      total: "10.10",
      estado: EstadoPedido.COBRADO,
      cobradoEn: new Date("2026-01-02T10:30:00Z"),
    }),
    pedido({
      pedidoId: 2,
      meseroId: 1,
      meseroNombre: "Lucía",
      total: "20.20",
      estado: EstadoPedido.CANCELADO,
      cobradoEn: new Date("2026-01-02T10:30:00Z"),
      canceladoEn: new Date("2026-01-02T10:40:00Z"),
    }),
    pedido({
      pedidoId: 3,
      meseroId: 1,
      meseroNombre: "Lucía",
      total: "30.30",
      estado: EstadoPedido.ENTREGADO,
    }),
  ]);

  const reporte = await obtenerReporteMeseros(
    meseroUno,
    { desde: "2026-01-01", hasta: "2026-01-31" },
    entorno.deps,
  );
  assert.equal(reporte.filas[0]?.pedidosCobrados, 1);
  assert.equal(reporte.filas[0]?.pedidosCancelados, 1);
  assert.equal(reporte.filas[0]?.totalVendido, "10.10");
});

test("procesa diez mil pedidos consultando las calificaciones en un solo lote", async () => {
  const pedidos = Array.from({ length: 10_000 }, (_, indice) =>
    pedido({
      pedidoId: indice + 1,
      meseroId: indice % 2 === 0 ? meseroUno.id : meseroDos.id,
      meseroNombre: indice % 2 === 0 ? meseroUno.nombre : meseroDos.nombre,
      estado: EstadoPedido.COBRADO,
      total: "1.25",
      cobradoEn: new Date("2026-01-02T10:00:00Z"),
    }),
  );
  const entorno = crearEntorno(pedidos);

  const reporte = await obtenerReporteMeseros(
    administrador,
    { desde: "2026-01-01", hasta: "2026-01-31" },
    entorno.deps,
  );

  assert.equal(reporte.filas.length, 2);
  assert.equal(reporte.filas[0]?.pedidosAtendidos, 5_000);
  assert.equal(reporte.filas[1]?.pedidosAtendidos, 5_000);
  assert.equal(entorno.idsConsultados.length, 1);
  assert.equal(entorno.idsConsultados[0]?.length, 10_000);
});

test("rechaza períodos de más de un año sin consultar la base", async () => {
  const entorno = crearEntorno([]);

  await assert.rejects(
    obtenerReporteMeseros(
      administrador,
      { desde: "2000-01-01", hasta: "2099-12-31" },
      entorno.deps,
    ),
    ErrorValidacion,
  );
  assert.equal(entorno.filtros.length, 0);

  // Un año completo (bisiesto incluido) sí se acepta.
  await obtenerReporteMeseros(
    administrador,
    { desde: "2028-01-01", hasta: "2028-12-31" },
    entorno.deps,
  );
  assert.equal(entorno.filtros.length, 1);
});
