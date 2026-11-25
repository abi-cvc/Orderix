import assert from "node:assert/strict";
import { test } from "node:test";
import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { estadosPermitidos, puedeEditarItems } from "./estados";

const mesero = { id: 1, rol: Rol.MESERO };
const otroMesero = { id: 2, rol: Rol.MESERO };
const cocina = { id: 3, rol: Rol.COCINA };
const cajero = { id: 4, rol: Rol.CAJERO };
const admin = { id: 5, rol: Rol.ADMINISTRADOR };
const pedido = (estado: EstadoPedido) => ({ estado, meseroId: mesero.id });

test("cocina avanza paso a paso y no puede saltarse estados", () => {
  assert.deepEqual(estadosPermitidos(pedido("CREADO"), cocina), ["EN_PREPARACION"]);
  assert.deepEqual(estadosPermitidos(pedido("EN_PREPARACION"), cocina), ["LISTO"]);
  assert.deepEqual(estadosPermitidos(pedido("LISTO"), cocina), []);
});

test("solo el mesero dueño entrega, y solo cancela antes de que cocina empiece", () => {
  assert.deepEqual(estadosPermitidos(pedido("LISTO"), mesero), ["ENTREGADO"]);
  assert.deepEqual(estadosPermitidos(pedido("CREADO"), mesero), ["CANCELADO"]);
  assert.deepEqual(estadosPermitidos(pedido("EN_PREPARACION"), mesero), []);
  assert.deepEqual(estadosPermitidos(pedido("LISTO"), otroMesero), []);
  assert.deepEqual(estadosPermitidos(pedido("CREADO"), otroMesero), []);
});

test("caja cobra solo lo entregado y cancela solo antes de que cocina empiece", () => {
  assert.deepEqual(estadosPermitidos(pedido("CREADO"), cajero), ["CANCELADO"]);
  assert.deepEqual(estadosPermitidos(pedido("EN_PREPARACION"), cajero), []);
  assert.deepEqual(estadosPermitidos(pedido("LISTO"), cajero), []);
  assert.deepEqual(estadosPermitidos(pedido("ENTREGADO"), cajero), ["COBRADO"]);
  assert.deepEqual(estadosPermitidos(pedido("COBRADO"), cajero), []);
  assert.deepEqual(estadosPermitidos(pedido("CANCELADO"), cajero), []);
});

test("el administrador no cambia estados", () => {
  for (const estado of Object.values(EstadoPedido)) {
    assert.deepEqual(estadosPermitidos(pedido(estado), admin), []);
  }
});

test("los ítems se editan solo por el dueño y antes de que el pedido esté listo", () => {
  assert.equal(puedeEditarItems(pedido("CREADO"), mesero), true);
  assert.equal(puedeEditarItems(pedido("EN_PREPARACION"), mesero), true);
  assert.equal(puedeEditarItems(pedido("LISTO"), mesero), false);
  assert.equal(puedeEditarItems(pedido("CREADO"), otroMesero), false);
  assert.equal(puedeEditarItems(pedido("CREADO"), cocina), false);
});
