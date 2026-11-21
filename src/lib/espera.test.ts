import assert from "node:assert/strict";
import { test } from "node:test";
import { minutosEsperando } from "@/lib/formato";
import { MINUTOS_DEMORADO, MINUTOS_URGENTE, nivelDeEspera } from "./espera";

test("la espera se clasifica en normal, demorado y urgente según los umbrales", () => {
  assert.equal(nivelDeEspera(0), "normal");
  assert.equal(nivelDeEspera(MINUTOS_DEMORADO - 1), "normal");
  assert.equal(nivelDeEspera(MINUTOS_DEMORADO), "demorado");
  assert.equal(nivelDeEspera(MINUTOS_URGENTE - 1), "demorado");
  assert.equal(nivelDeEspera(MINUTOS_URGENTE), "urgente");
});

test("los minutos de espera se cuentan enteros y nunca son negativos", () => {
  const ahora = Date.UTC(2026, 10, 21, 12, 0);
  assert.equal(minutosEsperando(new Date(ahora - 16 * 60_000 - 59_000), ahora), 16);
  assert.equal(minutosEsperando(new Date(ahora + 60_000), ahora), 0);
});
