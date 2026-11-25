import assert from "node:assert/strict";
import test from "node:test";
import { fechaHora, formatearHoraRelativa, hora, minutosDesde } from "./formato";

test("formatearHoraRelativa devuelve 'ahora' para fechas futuras o menores a 1 minuto", () => {
  const base = new Date("2026-11-22T20:00:00Z");

  // Futuro por diferencias de reloj
  const futuro1 = new Date("2026-11-22T20:05:00Z");
  const futuro2 = new Date("2026-11-22T20:00:10Z");
  assert.equal(formatearHoraRelativa(futuro1, base), "ahora");
  assert.equal(formatearHoraRelativa(futuro2, base), "ahora");

  // Menos de 60 segundos
  const ahora30s = new Date("2026-11-22T19:59:30Z");
  const ahora59s = new Date("2026-11-22T19:59:01Z");
  assert.equal(formatearHoraRelativa(ahora30s, base), "ahora");
  assert.equal(formatearHoraRelativa(ahora59s, base), "ahora");
});

test("formatearHoraRelativa devuelve 'hace N min' entre 1 y 59 minutos", () => {
  const base = new Date("2026-11-22T20:00:00Z");

  const hace1m = new Date("2026-11-22T19:59:00Z");
  const hace25m = new Date("2026-11-22T19:35:00Z");
  const hace59m = new Date("2026-11-22T19:01:00Z");

  assert.equal(formatearHoraRelativa(hace1m, base), "hace 1 min");
  assert.equal(formatearHoraRelativa(hace25m, base), "hace 25 min");
  assert.equal(formatearHoraRelativa(hace59m, base), "hace 59 min");
});

test("formatearHoraRelativa devuelve 'hoy HH:mm' para el mismo día a partir de 60 minutos", () => {
  // 20:00Z son las 15:00 en Ecuador (UTC-5)
  const base = new Date("2026-11-22T20:00:00Z");

  // 60 minutos antes (19:00Z -> 14:00 Ecuador)
  const hace60m = new Date("2026-11-22T19:00:00Z");
  assert.equal(formatearHoraRelativa(hace60m, base), "hoy 14:00");

  // 4 horas antes (16:00Z -> 11:00 Ecuador)
  const hace4h = new Date("2026-11-22T16:00:00Z");
  assert.equal(formatearHoraRelativa(hace4h, base), "hoy 11:00");

  // Temprano en la mañana de Ecuador (13:30Z -> 08:30 Ecuador)
  const temprano = new Date("2026-11-22T13:30:00Z");
  assert.equal(formatearHoraRelativa(temprano, base), "hoy 08:30");
});

test("formatearHoraRelativa devuelve 'ayer HH:mm' para mensajes del día anterior en Ecuador", () => {
  // Caso 1: Medianoche en Ecuador (05:15Z del 22/11 -> 00:15 del 22/11 en Ecuador)
  const medianocheEcuador = new Date("2026-11-22T05:15:00Z");
  // 75 min antes en UTC fue 04:00Z -> 23:00 del 21/11 en Ecuador
  const ayerEcuador = new Date("2026-11-22T04:00:00Z");
  assert.equal(formatearHoraRelativa(ayerEcuador, medianocheEcuador), "ayer 23:00");

  // Caso 2: 24 horas antes
  const base = new Date("2026-11-22T20:00:00Z"); // 15:00 Ecuador
  const hace24h = new Date("2026-11-21T20:00:00Z"); // 15:00 Ecuador del día anterior
  assert.equal(formatearHoraRelativa(hace24h, base), "ayer 15:00");
});

test("formatearHoraRelativa devuelve 'dd/MM HH:mm' para días anteriores a ayer", () => {
  const base = new Date("2026-11-22T20:00:00Z"); // 22/11 15:00 Ecuador

  // 3 días antes: 19/11 a las 14:30 UTC -> 09:30 Ecuador
  const hace3Dias = new Date("2026-11-19T14:30:00Z");
  assert.equal(formatearHoraRelativa(hace3Dias, base), "19/11 09:30");

  // 10 días antes: 12/11 a las 22:45 UTC -> 17:45 Ecuador
  const hace10Dias = new Date("2026-11-12T22:45:00Z");
  assert.equal(formatearHoraRelativa(hace10Dias, base), "12/11 17:45");
});

test("utilidades generales de formato mantienen su comportamiento esperado", () => {
  const d = new Date("2026-11-22T20:00:00Z");
  assert.ok(hora(d).includes("03:00") || hora(d).includes("15:00"));
  assert.ok(fechaHora(d).includes("22/11/2026"));
  assert.equal(minutosDesde(d, d.getTime() + 5_000), "recién");
  assert.equal(minutosDesde(d, d.getTime() + 120_000), "hace 2 min");
});
