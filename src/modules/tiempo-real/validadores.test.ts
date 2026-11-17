/**
 * Pruebas de los esquemas Zod de validación del módulo tiempo-real.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  esquemaEnviarMensaje,
  esquemaNombreSala,
  esquemaTextoMensaje,
  SALA_GENERAL,
} from "./validadores";

// ----------------------------------------------------------------- esquemaTextoMensaje

test("esquemaTextoMensaje: acepta texto válido y recorta espacios", () => {
  const resultado = esquemaTextoMensaje.parse("   Hola mundo   ");
  assert.equal(resultado, "Hola mundo");
});

test("esquemaTextoMensaje: elimina caracteres de control y caracteres invisibles de formato", () => {
  const textoConInvisibles = "Aviso\u0000\u0007\u200B\u2060\uFEFFimportante";
  const resultado = esquemaTextoMensaje.parse(textoConInvisibles);
  assert.equal(resultado, "Avisoimportante");
});

test("esquemaTextoMensaje: rechaza texto vacío, solo espacios o solo caracteres invisibles", () => {
  for (const entradaInvalida of ["", "   ", "\u0000\u0007", "\u200B\u2060\uFEFF", "   \u200B   "]) {
    const res = esquemaTextoMensaje.safeParse(entradaInvalida);
    assert.equal(res.success, false);
  }
});

test("esquemaTextoMensaje: valida longitud límite (exactamente 1000 válido, 1001 inválido)", () => {
  const exactosMil = "x".repeat(1000);
  const milUno = "x".repeat(1001);

  assert.equal(esquemaTextoMensaje.safeParse(exactosMil).success, true);
  assert.equal(esquemaTextoMensaje.safeParse(milUno).success, false);
});

// ----------------------------------------------------------------- esquemaNombreSala

test("esquemaNombreSala: sala válida y valor por defecto", () => {
  assert.equal(esquemaNombreSala.parse(undefined), SALA_GENERAL);
  assert.equal(esquemaNombreSala.parse("cocina"), "cocina");
  assert.equal(esquemaNombreSala.parse("  mesas  "), "mesas");
});

test("esquemaNombreSala: rechaza nombres vacíos o excesivamente largos", () => {
  assert.equal(esquemaNombreSala.safeParse("").success, false);
  assert.equal(esquemaNombreSala.safeParse("   ").success, false);
  assert.equal(esquemaNombreSala.safeParse("s".repeat(61)).success, false);
});

// ----------------------------------------------------------------- esquemaEnviarMensaje

test("esquemaEnviarMensaje: procesa payload con sala opcional", () => {
  const conSala = esquemaEnviarMensaje.parse({ texto: "Aviso", sala: "cocina" });
  assert.deepEqual(conSala, { texto: "Aviso", sala: "cocina" });

  const sinSala = esquemaEnviarMensaje.parse({ texto: "General" });
  assert.deepEqual(sinSala, { texto: "General", sala: SALA_GENERAL });
});
