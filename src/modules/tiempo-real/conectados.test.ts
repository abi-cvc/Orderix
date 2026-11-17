/**
 * Pruebas de la gestión de usuarios conectados en memoria.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { crearAlmacenConectados } from "./conectados";

test("un usuario con dos pestañas aparece una sola vez en la lista", () => {
  const almacen = crearAlmacenConectados();
  const usuario = { id: 1, nombre: "Lucía" };

  const primeraConexion = almacen.conectar(usuario, "socket_tab_1");
  assert.equal(primeraConexion, true);
  assert.equal(almacen.total(), 1);
  assert.deepEqual(almacen.listar(), [{ id: 1, nombre: "Lucía" }]);

  const segundaConexion = almacen.conectar(usuario, "socket_tab_2");
  assert.equal(segundaConexion, false);
  assert.equal(almacen.total(), 1);
  assert.deepEqual(almacen.listar(), [{ id: 1, nombre: "Lucía" }]);
});

test("al cerrar una pestaña sigue conectado, y al cerrar la última desaparece", () => {
  const almacen = crearAlmacenConectados();
  const usuario = { id: 1, nombre: "Lucía" };

  almacen.conectar(usuario, "socket_tab_1");
  almacen.conectar(usuario, "socket_tab_2");

  // Cierra una pestaña (aún le queda socket_tab_2)
  const eliminadoPestana1 = almacen.desconectar("socket_tab_1");
  assert.equal(eliminadoPestana1, false);
  assert.equal(almacen.total(), 1);
  assert.deepEqual(almacen.listar(), [{ id: 1, nombre: "Lucía" }]);

  // Cierra la última pestaña
  const eliminadoPestana2 = almacen.desconectar("socket_tab_2");
  assert.equal(eliminadoPestana2, true);
  assert.equal(almacen.total(), 0);
  assert.deepEqual(almacen.listar(), []);
});

test("gestiona varios usuarios distintos sin mezclarlos", () => {
  const almacen = crearAlmacenConectados();
  const lucia = { id: 1, nombre: "Lucía" };
  const diego = { id: 2, nombre: "Diego" };

  almacen.conectar(lucia, "socket_lucia_1");
  almacen.conectar(diego, "socket_diego_1");

  assert.equal(almacen.total(), 2);
  const lista = almacen.listar();
  assert.equal(lista.length, 2);
  assert.ok(lista.some((u) => u.id === 1 && u.nombre === "Lucía"));
  assert.ok(lista.some((u) => u.id === 2 && u.nombre === "Diego"));

  // Desconectar a Lucía
  almacen.desconectar("socket_lucia_1");
  assert.equal(almacen.total(), 1);
  assert.deepEqual(almacen.listar(), [{ id: 2, nombre: "Diego" }]);
});

test("desconectar un socket desconocido no rompe nada", () => {
  const almacen = crearAlmacenConectados();
  almacen.conectar({ id: 1, nombre: "Lucía" }, "socket_real");

  const resultado = almacen.desconectar("socket_fantasma");
  assert.equal(resultado, false);
  assert.equal(almacen.total(), 1);
  assert.deepEqual(almacen.listar(), [{ id: 1, nombre: "Lucía" }]);
});
