import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BLOQUEO_MS,
  crearLimitadorIntentos,
  ErrorLimiteIntentos,
  MAXIMO_INTENTOS_IP,
} from "./limite";

test("consultar el bloqueo no consume intentos", () => {
  const limite = crearLimitadorIntentos(() => 0);
  for (let i = 0; i < 100; i++) {
    limite.comprobarBloqueo("login", "192.0.2.1", "ana@example.com");
  }
});

test("ambos flujos admiten 30 intentos por IP con correos distintos y bloquean el siguiente", () => {
  for (const operacion of ["login", "recuperacion"] as const) {
    const limite = crearLimitadorIntentos(() => 0);
    for (let i = 0; i < MAXIMO_INTENTOS_IP; i++) {
      const correo = `usuario${i}@example.com`;
      limite.comprobarBloqueo(operacion, "192.0.2.1", correo);
      limite.registrarIntento(operacion, "192.0.2.1", correo);
    }
    assert.throws(
      () => limite.comprobarBloqueo(operacion, "192.0.2.1", "otro@example.com"),
      ErrorLimiteIntentos,
    );
    assert.doesNotThrow(() => limite.comprobarBloqueo(operacion, "192.0.2.2", "otro@example.com"));
  }
});

test("ambos flujos bloquean cinco intentos por correo normalizado aunque cambie la IP", () => {
  for (const operacion of ["login", "recuperacion"] as const) {
    const limite = crearLimitadorIntentos(() => 0);
    for (let i = 0; i < 5; i++)
      limite.registrarIntento(operacion, `192.0.2.${i}`, " ANA@EXAMPLE.COM ");
    assert.throws(
      () => limite.comprobarBloqueo(operacion, "192.0.2.99", "ana@example.com"),
      ErrorLimiteIntentos,
    );
  }
});

test("el bloqueo dura 15 minutos desde el quinto fallo sin extenderse por fallos en vuelo", () => {
  let instante = 0;
  const limite = crearLimitadorIntentos(() => instante);
  for (let i = 0; i < 4; i++) limite.registrarIntento("login", "192.0.2.1", "ana@example.com");
  instante = 60_000;
  limite.registrarIntento("login", "192.0.2.1", "ana@example.com");
  instante += BLOQUEO_MS - 1;
  limite.registrarIntento("login", "192.0.2.1", "ana@example.com");
  assert.throws(
    () => limite.comprobarBloqueo("login", "192.0.2.1", "ana@example.com"),
    (error: unknown) => error instanceof ErrorLimiteIntentos && error.reintentarEnSegundos === 1,
  );
  instante += 1;
  assert.doesNotThrow(() => limite.comprobarBloqueo("login", "192.0.2.1", "ana@example.com"));
});

test("los fallos dispersos vencen y no se acumulan indefinidamente", () => {
  let instante = 0;
  const limite = crearLimitadorIntentos(() => instante);
  for (let i = 0; i < 4; i++) limite.registrarIntento("login", "192.0.2.1", "ana@example.com");
  instante = BLOQUEO_MS;
  limite.registrarIntento("login", "192.0.2.1", "ana@example.com");
  assert.doesNotThrow(() => limite.comprobarBloqueo("login", "192.0.2.1", "ana@example.com"));
});

test("reiniciar un correo de login conserva la cuota de IP, los otros correos y recuperación", () => {
  const limite = crearLimitadorIntentos(() => 0);
  for (let i = 0; i < 5; i++) {
    limite.registrarIntento("login", "192.0.2.1", "otro@example.com");
    limite.registrarIntento("recuperacion", "192.0.2.1", "ana@example.com");
  }
  for (let i = 0; i < 4; i++) limite.registrarIntento("login", "192.0.2.1", "ana@example.com");
  limite.reiniciarCorreoLogin(" ANA@EXAMPLE.COM ");
  for (let i = 0; i < 4; i++) limite.registrarIntento("login", "192.0.2.2", "ana@example.com");
  assert.doesNotThrow(() => limite.comprobarBloqueo("login", "192.0.2.2", "ana@example.com"));
  assert.throws(
    () => limite.comprobarBloqueo("login", "192.0.2.2", "otro@example.com"),
    ErrorLimiteIntentos,
  );
  assert.throws(
    () => limite.comprobarBloqueo("recuperacion", "192.0.2.2", "ana@example.com"),
    ErrorLimiteIntentos,
  );
  for (let i = 0; i < MAXIMO_INTENTOS_IP - 9; i++) {
    limite.registrarIntento("login", "192.0.2.1", `usuario${i}@example.com`);
  }
  assert.throws(
    () => limite.comprobarBloqueo("login", "192.0.2.1", "nuevo@example.com"),
    ErrorLimiteIntentos,
  );
});

test("login y recuperación tienen cuotas independientes", () => {
  const limite = crearLimitadorIntentos(() => 0);
  for (let i = 0; i < 5; i++) limite.registrarIntento("login", "192.0.2.1", "ana@example.com");
  assert.doesNotThrow(() =>
    limite.comprobarBloqueo("recuperacion", "192.0.2.1", "ana@example.com"),
  );
  assert.throws(
    () => limite.comprobarBloqueo("login", "192.0.2.1", "ana@example.com"),
    ErrorLimiteIntentos,
  );
});
