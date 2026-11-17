/**
 * Pruebas del servicio de pedidos con un repositorio en memoria: no necesitan
 * base de datos. Cubren permisos, reglas del flujo, cálculo del total y avisos.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/lib/errores";
import type { ProductoParaPedido } from "@/modules/menu";
import { calcularTotal, type NuevoItem, type PedidoGuardado } from "./repositorio";
import {
  cambiarEstado,
  crearPedido,
  editarItem,
  listarPedidos,
  obtenerPedido,
  type DependenciasPedidos,
} from "./servicio";
import { esquemaCrearPedido } from "./validadores";

const mesero = { id: 1, nombre: "Lucía", rol: Rol.MESERO };
const otroMesero = { id: 2, nombre: "Carlos", rol: Rol.MESERO };
const cocina = { id: 3, nombre: "Diego", rol: Rol.COCINA };
const cajero = { id: 4, nombre: "Sofía", rol: Rol.CAJERO };

const MENU: ProductoParaPedido[] = [
  { id: 1, nombre: "Empanadas", precio: "3.50", disponible: true },
  { id: 2, nombre: "Ceviche", precio: "8.90", disponible: true },
  { id: 3, nombre: "Locro", precio: "4.75", disponible: false },
];

/** Dependencias falsas: pedidos en memoria y registro de los eventos publicados. */
function crearEntorno(opciones: { carreraAlCambiarEstado?: boolean } = {}) {
  const pedidos = new Map<number, PedidoGuardado>();
  const eventos: { tipo: string; datos: Record<string, unknown> }[] = [];
  const consultas: unknown[] = [];
  let siguienteId = 1;

  const repositorio = {
    async crearPedido(datos: {
      numeroMesa: number;
      meseroId: number;
      meseroNombre: string;
      notas?: string;
      items: NuevoItem[];
    }) {
      const pedido: PedidoGuardado = {
        id: siguienteId++,
        numeroMesa: datos.numeroMesa,
        meseroId: datos.meseroId,
        meseroNombre: datos.meseroNombre,
        estado: EstadoPedido.CREADO,
        total: calcularTotal(datos.items),
        notas: datos.notas ?? null,
        creadoEn: new Date(),
        cerradoEn: null,
        items: datos.items.map((item, i) => ({
          ...item,
          id: 100 + i,
          alergias: item.alergias ?? null,
          notas: item.notas ?? null,
          agregadoEn: new Date(),
        })),
      };
      pedidos.set(pedido.id, pedido);
      return pedido;
    },
    async buscarResumen(id: number) {
      const p = pedidos.get(id);
      return p
        ? { id: p.id, estado: p.estado, meseroId: p.meseroId, numeroMesa: p.numeroMesa }
        : null;
    },
    async buscarPedido(id: number) {
      return pedidos.get(id) ?? null;
    },
    async buscarCambios() {
      return [];
    },
    async buscarItem(itemId: number) {
      for (const p of pedidos.values()) {
        const item = p.items.find((i) => i.id === itemId);
        if (item) {
          return {
            id: item.id,
            pedidoId: p.id,
            nombreProducto: item.nombreProducto,
            alergias: item.alergias,
            pedido: { estado: p.estado, meseroId: p.meseroId, numeroMesa: p.numeroMesa },
          };
        }
      }
      return null;
    },
    async editarItem(
      itemId: number,
      pedidoId: number,
      datos: { cantidad: number; alergias: string | null; notas: string | null },
    ) {
      const p = pedidos.get(pedidoId)!;
      p.items = p.items.map((i) => (i.id === itemId ? { ...i, ...datos } : i));
    },
    async cambiarEstado(datos: {
      pedidoId: number;
      de: EstadoPedido;
      a: EstadoPedido;
      cerrar: boolean;
    }) {
      const p = pedidos.get(datos.pedidoId)!;
      if (opciones.carreraAlCambiarEstado || p.estado !== datos.de) return false as const;
      p.estado = datos.a;
      if (datos.cerrar) p.cerradoEn = new Date();
      return new Date();
    },
    async listar(consulta: unknown) {
      consultas.push(consulta);
      return { pedidos: [], total: 0 };
    },
  };

  const deps = {
    repositorio: repositorio as unknown as DependenciasPedidos["repositorio"],
    obtenerProductosParaPedido: async (ids: number[]) => MENU.filter((p) => ids.includes(p.id)),
    obtenerNombresDeUsuarios: async () => new Map<number, string>(),
    publicarEvento: ((tipo: string, datos: Record<string, unknown>) => {
      eventos.push({ tipo, datos });
    }) as DependenciasPedidos["publicarEvento"],
  };
  return { deps, pedidos, eventos, consultas };
}

/** Crea un pedido de la mesa 4 y lo lleva hasta `estado` cambiando el valor guardado. */
async function pedidoEn(entorno: ReturnType<typeof crearEntorno>, estado: EstadoPedido) {
  const p = await crearPedido(
    mesero,
    { numeroMesa: 4, items: [{ productoId: 1, cantidad: 1, alergias: "maní" }] },
    entorno.deps,
  );
  entorno.pedidos.get(p.id)!.estado = estado;
  entorno.eventos.length = 0;
  return p;
}

// ----------------------------------------------------------------- total

test("el total se calcula en centavos, sin errores de redondeo", () => {
  assert.equal(calcularTotal([{ cantidad: 3, precioUnitario: "0.10" }]), "0.30");
  assert.equal(
    calcularTotal([
      { cantidad: 2, precioUnitario: "8.90" },
      { cantidad: 3, precioUnitario: "3.50" },
    ]),
    "28.30",
  );
  assert.equal(calcularTotal([]), "0.00");
});

// ----------------------------------------------------------------- crear

test("crear pedido copia nombre y precio del menú e ignora el precio del navegador", async () => {
  const entorno = crearEntorno();
  const pedido = await crearPedido(
    mesero,
    {
      numeroMesa: "4",
      items: JSON.stringify([
        { productoId: 2, cantidad: 2, alergias: "maní", precioUnitario: "0.01" },
        { productoId: 1, cantidad: 3 },
      ]),
    },
    entorno.deps,
  );

  assert.equal(pedido.total, "28.30");
  assert.deepEqual(
    pedido.items.map((i) => [i.nombreProducto, i.precioUnitario]),
    [
      ["Ceviche", "8.90"],
      ["Empanadas", "3.50"],
    ],
  );
  assert.equal(pedido.meseroId, mesero.id);
  assert.equal(entorno.eventos[0]?.tipo, "pedido.creado");
  assert.equal(entorno.eventos[0]?.datos.tieneAlergias, true);
});

test("solo un mesero crea pedidos, y no con productos no disponibles o inexistentes", async () => {
  const entorno = crearEntorno();
  const entrada = (productoId: number) => ({
    numeroMesa: 1,
    items: [{ productoId, cantidad: 1 }],
  });

  await assert.rejects(crearPedido(cocina, entrada(1), entorno.deps), ErrorProhibido);
  await assert.rejects(crearPedido(mesero, entrada(3), entorno.deps), (error: ErrorValidacion) => {
    assert.deepEqual(error.campos, { "items.0.productoId": ['"Locro" no está disponible.'] });
    return true;
  });
  await assert.rejects(crearPedido(mesero, entrada(99), entorno.deps), ErrorValidacion);
  assert.equal(entorno.pedidos.size, 0);
  assert.equal(entorno.eventos.length, 0);
});

test("los validadores aceptan los ítems como JSON y rechazan mesas fuera de rango", () => {
  const valido = esquemaCrearPedido.safeParse({
    numeroMesa: "12",
    items: '[{"productoId":"1","cantidad":"2","alergias":"  "}]',
  });
  assert.equal(valido.success, true);
  assert.equal(valido.data?.items[0]?.alergias, undefined); // "  " se guarda como vacío

  assert.equal(esquemaCrearPedido.safeParse({ numeroMesa: 13, items: [] }).success, false);
  assert.equal(
    esquemaCrearPedido.safeParse({ numeroMesa: 1, items: [{ productoId: 1, cantidad: 21 }] })
      .success,
    false,
  );
});

// ----------------------------------------------------------------- visibilidad

test("un mesero no ve ni cambia pedidos de otro mesero (responde como inexistente)", async () => {
  const entorno = crearEntorno();
  const pedido = await pedidoEn(entorno, EstadoPedido.CREADO);

  await assert.rejects(obtenerPedido(otroMesero, pedido.id, entorno.deps), ErrorNoEncontrado);
  await assert.rejects(
    cambiarEstado(otroMesero, { pedidoId: pedido.id, estado: "CANCELADO" }, entorno.deps),
    ErrorNoEncontrado,
  );
  const visto = await obtenerPedido(mesero, pedido.id, entorno.deps);
  assert.deepEqual(visto.estadosPermitidos, ["CANCELADO"]);
});

test("el listado del mesero se filtra por su id; caja ve todos; filtros inválidos se ignoran", async () => {
  const entorno = crearEntorno();
  await listarPedidos(mesero, { pagina: "2", estado: "LISTO" }, entorno.deps);
  await listarPedidos(cajero, { pagina: "abc", estado: "INVENTADO", mesa: "x" }, entorno.deps);

  assert.deepEqual(entorno.consultas[0], {
    meseroId: 1,
    id: undefined,
    numeroMesa: undefined,
    estado: "LISTO",
    salto: 15,
    cantidad: 15,
  });
  assert.deepEqual(entorno.consultas[1], {
    meseroId: undefined,
    id: undefined,
    numeroMesa: undefined,
    estado: undefined,
    salto: 0,
    cantidad: 15,
  });
  await assert.rejects(listarPedidos(cocina, {}, entorno.deps), ErrorProhibido);
});

// ----------------------------------------------------------------- estados

test("cambiar de estado publica el aviso con el mesero dueño y cierra al cobrar", async () => {
  const entorno = crearEntorno();
  const pedido = await pedidoEn(entorno, EstadoPedido.ENTREGADO);

  await cambiarEstado(cajero, { pedidoId: pedido.id, estado: "COBRADO" }, entorno.deps);

  const guardado = entorno.pedidos.get(pedido.id)!;
  assert.equal(guardado.estado, "COBRADO");
  assert.ok(guardado.cerradoEn);
  assert.equal(entorno.eventos[0]?.tipo, "pedido.estadoCambiado");
  assert.equal(entorno.eventos[0]?.datos.meseroId, mesero.id);
  assert.equal(entorno.eventos[0]?.datos.estadoAnterior, "ENTREGADO");
});

test("transición no permitida → prohibido; pedido cerrado → conflicto", async () => {
  const entorno = crearEntorno();
  const creado = await pedidoEn(entorno, EstadoPedido.CREADO);
  await assert.rejects(
    cambiarEstado(cocina, { pedidoId: creado.id, estado: "LISTO" }, entorno.deps),
    ErrorProhibido,
  );
  await assert.rejects(
    cambiarEstado(cajero, { pedidoId: creado.id, estado: "COBRADO" }, entorno.deps),
    ErrorProhibido,
  );

  const cobrado = await pedidoEn(entorno, EstadoPedido.COBRADO);
  await assert.rejects(
    cambiarEstado(cajero, { pedidoId: cobrado.id, estado: "CANCELADO" }, entorno.deps),
    ErrorConflicto,
  );
  assert.equal(entorno.eventos.length, 0);
});

test("si otro usuario cambió el pedido primero (doble cobro), se responde conflicto sin aviso", async () => {
  const entorno = crearEntorno({ carreraAlCambiarEstado: true });
  const pedido = await pedidoEn(entorno, EstadoPedido.ENTREGADO);

  await assert.rejects(
    cambiarEstado(cajero, { pedidoId: pedido.id, estado: "COBRADO" }, entorno.deps),
    ErrorConflicto,
  );
  assert.equal(entorno.eventos.length, 0);
});

// ----------------------------------------------------------------- alergias

test("cambiar la alergia de un ítem avisa a cocina; dejarla igual no", async () => {
  const entorno = crearEntorno();
  const pedido = await pedidoEn(entorno, EstadoPedido.EN_PREPARACION);
  const itemId = pedido.items[0]!.id;

  await editarItem(mesero, { itemId, cantidad: 2, alergias: "maní" }, entorno.deps);
  assert.equal(entorno.eventos.length, 0);

  await editarItem(mesero, { itemId, cantidad: 2, alergias: "gluten" }, entorno.deps);
  assert.equal(entorno.eventos[0]?.tipo, "pedido.alergiaAgregada");
  assert.equal(entorno.eventos[0]?.datos.alergias, "gluten");
  assert.equal(entorno.eventos[0]?.datos.numeroMesa, 4);

  entorno.pedidos.get(pedido.id)!.estado = EstadoPedido.LISTO;
  await assert.rejects(
    editarItem(mesero, { itemId, cantidad: 1, alergias: "soya" }, entorno.deps),
    ErrorConflicto,
  );
});
