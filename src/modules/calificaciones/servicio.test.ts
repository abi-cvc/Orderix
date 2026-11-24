import assert from "node:assert/strict";
import { test } from "node:test";
import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { ErrorConflicto, ErrorProhibido, ErrorValidacion } from "@/lib/errores";
import type { UsuarioSesion } from "@/modules/autenticacion";
import type { CalificacionGuardada } from "./repositorio";
import {
  calificacionesDePedidos,
  calificarPedido,
  obtenerCalificacion,
  type DependenciasCalificaciones,
} from "./servicio";

const cajero: UsuarioSesion = { id: 7, nombre: "Sofía", rol: Rol.CAJERO };
const mesero: UsuarioSesion = { id: 2, nombre: "Lucía", rol: Rol.MESERO };
const pedidoId = 42;

function crearEntorno(
  estado: EstadoPedido = EstadoPedido.COBRADO,
  existente: CalificacionGuardada | null = null,
) {
  const registros = new Map<number, CalificacionGuardada>();
  if (existente) registros.set(existente.pedidoId, existente);
  const datosCreados: { pedidoId: number; puntaje: number; cajeroId: number }[] = [];

  const deps: DependenciasCalificaciones = {
    async obtenerEstadoPedido(id) {
      return id === pedidoId ? { id, estado } : null;
    },
    repositorio: {
      async buscarPorPedido(id) {
        return registros.get(id) ?? null;
      },
      async crear(datos) {
        datosCreados.push(datos);
        const calificacion: CalificacionGuardada = {
          id: registros.size + 1,
          pedidoId: datos.pedidoId,
          puntaje: datos.puntaje,
          fecha: new Date("2026-01-01T00:00:00Z"),
        };
        registros.set(datos.pedidoId, calificacion);
        return calificacion;
      },
    },
  };

  return { deps, registros, datosCreados };
}

test("calificarPedido permite al cajero calificar un pedido cobrado", async () => {
  const entorno = crearEntorno();

  const guardada = await calificarPedido(
    cajero,
    { pedidoId: String(pedidoId), puntaje: "5" },
    entorno.deps,
  );

  assert.equal(guardada.pedidoId, pedidoId);
  assert.equal(guardada.puntaje, 5);
  assert.deepEqual(entorno.datosCreados, [{ pedidoId, puntaje: 5, cajeroId: cajero.id }]);
});

test("calificarPedido rechaza a quien no tiene el rol de cajero", async () => {
  const entorno = crearEntorno();

  await assert.rejects(
    calificarPedido(mesero, { pedidoId, puntaje: 4 }, entorno.deps),
    ErrorProhibido,
  );
  assert.equal(entorno.datosCreados.length, 0);
});

test("calificarPedido rechaza pedidos no cobrados y calificaciones duplicadas", async () => {
  const pendiente = crearEntorno(EstadoPedido.ENTREGADO);
  await assert.rejects(
    calificarPedido(cajero, { pedidoId, puntaje: 4 }, pendiente.deps),
    ErrorConflicto,
  );

  const existente = crearEntorno(EstadoPedido.COBRADO, {
    id: 1,
    pedidoId,
    puntaje: 3,
    fecha: new Date("2026-01-01T00:00:00Z"),
  });
  await assert.rejects(
    calificarPedido(cajero, { pedidoId, puntaje: 4 }, existente.deps),
    ErrorConflicto,
  );
  assert.equal(existente.datosCreados.length, 0);
});

test("calificarPedido valida el puntaje en el servidor", async () => {
  const entorno = crearEntorno();

  await assert.rejects(
    calificarPedido(cajero, { pedidoId, puntaje: 6 }, entorno.deps),
    ErrorValidacion,
  );
  assert.equal(entorno.datosCreados.length, 0);
});

test("obtenerCalificacion distingue entre un pedido sin calificar y uno calificado", async () => {
  const entorno = crearEntorno();

  assert.equal(await obtenerCalificacion(pedidoId, entorno.deps), null);

  await calificarPedido(cajero, { pedidoId, puntaje: 4 }, entorno.deps);
  assert.equal((await obtenerCalificacion(pedidoId, entorno.deps))?.puntaje, 4);
});

test("calificacionesDePedidos no consulta con una lista vacía y no repite ids", async () => {
  const consultas: number[][] = [];
  const deps = {
    async listarPorPedidos(ids: number[]) {
      consultas.push(ids);
      return ids.map((id) => ({ id, pedidoId: id, puntaje: 4, fecha: new Date(0) }));
    },
  };

  assert.deepEqual(await calificacionesDePedidos([], deps), []);
  assert.equal(consultas.length, 0);

  const resultado = await calificacionesDePedidos([3, 3, 8, -1], deps);
  assert.deepEqual(consultas, [[3, 8]]);
  assert.equal(resultado.length, 2);
});
