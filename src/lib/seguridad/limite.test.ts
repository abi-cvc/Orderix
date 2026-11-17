import assert from "node:assert/strict";
import { test } from "node:test";
import { BLOQUEO_MS, crearLimitadorIntentos, ErrorLimiteIntentos } from "./limite";

test("permite cinco intentos por IP aunque se cambie de correo y bloquea el sexto", () => {
  const limitar = crearLimitadorIntentos(() => 0);
  for (let i = 0; i < 5; i++) limitar("login", "192.0.2.1", `usuario${i}@example.com`);
  assert.throws(() => limitar("login", "192.0.2.1", "otro@example.com"), ErrorLimiteIntentos);
  assert.doesNotThrow(() => limitar("login", "192.0.2.2", "otro@example.com"));
});

test("limita el correo normalizado aunque las IP sean distintas", () => {
  const limitar = crearLimitadorIntentos(() => 0);
  for (let i = 0; i < 5; i++) limitar("recuperacion", `192.0.2.${i}`, " ANA@EXAMPLE.COM ");
  assert.throws(
    () => limitar("recuperacion", "192.0.2.99", "ana@example.com"),
    ErrorLimiteIntentos,
  );
});

test("el bloqueo dura 15 minutos desde el quinto intento y los rechazos no lo extienden", () => {
  let instante = 0;
  const limitar = crearLimitadorIntentos(() => instante);
  for (let i = 0; i < 4; i++) limitar("login", "192.0.2.1", "ana@example.com");
  instante = 60_000;
  limitar("login", "192.0.2.1", "ana@example.com");
  instante += BLOQUEO_MS - 1;
  assert.throws(
    () => limitar("login", "192.0.2.1", "ana@example.com"),
    (error: unknown) => error instanceof ErrorLimiteIntentos && error.reintentarEnSegundos === 1,
  );
  instante += 1;
  for (let i = 0; i < 5; i++) limitar("login", "192.0.2.1", "ana@example.com");
  assert.throws(() => limitar("login", "192.0.2.1", "ana@example.com"), ErrorLimiteIntentos);
});

test("los intentos dispersos vencen y no se acumulan indefinidamente", () => {
  let instante = 0;
  const limitar = crearLimitadorIntentos(() => instante);
  for (let i = 0; i < 4; i++) limitar("login", "192.0.2.1", "ana@example.com");
  instante = BLOQUEO_MS;
  for (let i = 0; i < 5; i++) limitar("login", "192.0.2.1", "ana@example.com");
});

test("login y recuperación tienen cuotas independientes", () => {
  const limitar = crearLimitadorIntentos(() => 0);
  for (let i = 0; i < 5; i++) limitar("login", "192.0.2.1", "ana@example.com");
  assert.doesNotThrow(() => limitar("recuperacion", "192.0.2.1", "ana@example.com"));
  assert.throws(() => limitar("login", "192.0.2.1", "ana@example.com"), ErrorLimiteIntentos);
});
