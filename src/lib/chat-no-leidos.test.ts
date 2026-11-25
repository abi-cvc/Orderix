import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcularNoLeidosAlRecibir,
  debeContarMensaje,
  esRutaChat,
  formatearAriaLabelChat,
  formatearInsigniaNoLeidos,
} from "./chat-no-leidos";

test("esRutaChat identifica la ruta del chat", () => {
  assert.equal(esRutaChat("/chat"), true);
  assert.equal(esRutaChat("/chat/general"), true);
  assert.equal(esRutaChat("/pedidos"), false);
  assert.equal(esRutaChat("/"), false);
});

test("no cuenta los mensajes propios ni los recibidos estando en /chat", () => {
  const usuarioId = 1;
  const mensajePropio = { autorId: 1 };
  const mensajeAjeno = { autorId: 2 };

  // Mensaje propio nunca se cuenta
  assert.equal(debeContarMensaje(mensajePropio, usuarioId, "/pedidos"), false);
  assert.equal(debeContarMensaje(mensajePropio, usuarioId, "/chat"), false);

  // Mensaje ajeno no se cuenta si está en /chat
  assert.equal(debeContarMensaje(mensajeAjeno, usuarioId, "/chat"), false);

  // Mensaje ajeno se cuenta si está en otra pantalla
  assert.equal(debeContarMensaje(mensajeAjeno, usuarioId, "/pedidos"), true);
  assert.equal(debeContarMensaje(mensajeAjeno, usuarioId, "/cocina"), true);
  assert.equal(debeContarMensaje(mensajeAjeno, usuarioId, "/"), true);
});

test("calcularNoLeidosAlRecibir incrementa solo cuando corresponde", () => {
  const usuarioId = 1;
  const mensajeAjeno = { autorId: 2 };
  const mensajePropio = { autorId: 1 };

  // Estando en /pedidos, un mensaje ajeno incrementa
  assert.equal(calcularNoLeidosAlRecibir(0, mensajeAjeno, usuarioId, "/pedidos"), 1);
  assert.equal(calcularNoLeidosAlRecibir(5, mensajeAjeno, usuarioId, "/pedidos"), 6);

  // Mensaje propio no incrementa
  assert.equal(calcularNoLeidosAlRecibir(3, mensajePropio, usuarioId, "/pedidos"), 3);

  // Estando en /chat, no incrementa
  assert.equal(calcularNoLeidosAlRecibir(0, mensajeAjeno, usuarioId, "/chat"), 0);
});

test("formatearInsigniaNoLeidos muestra 99+ a partir de 100", () => {
  assert.equal(formatearInsigniaNoLeidos(0), "");
  assert.equal(formatearInsigniaNoLeidos(-1), "");
  assert.equal(formatearInsigniaNoLeidos(1), "1");
  assert.equal(formatearInsigniaNoLeidos(99), "99");
  assert.equal(formatearInsigniaNoLeidos(100), "99+");
  assert.equal(formatearInsigniaNoLeidos(250), "99+");
});

test("formatearAriaLabelChat incluye texto visible y pluralización correcta", () => {
  assert.equal(formatearAriaLabelChat(0), "Chat");
  assert.equal(formatearAriaLabelChat(1), "Chat, 1 mensaje sin leer");
  assert.equal(formatearAriaLabelChat(2), "Chat, 2 mensajes sin leer");
  assert.equal(formatearAriaLabelChat(100), "Chat, 100 mensajes sin leer");
});
