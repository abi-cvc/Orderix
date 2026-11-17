/**
 * Pruebas del servicio de tiempo real (chat) con repositorio en memoria.
 * No necesitan base de datos. Cubren validación, saneamiento, autoría de sesión y salas.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { Rol } from "@/generated/prisma/enums";
import { ErrorNoEncontrado, ErrorValidacion } from "@/lib/errores";
import type { MensajeGuardado, SalaGuardada } from "./repositorio";
import { enviarMensaje, obtenerHistorial, type DependenciasTiempoReal } from "./servicio";

const mesero = { id: 1, nombre: "Lucía", rol: Rol.MESERO };
const cocina = { id: 2, nombre: "Diego", rol: Rol.COCINA };
const cajero = { id: 3, nombre: "Sofía", rol: Rol.CAJERO };
const admin = { id: 4, nombre: "Andrea", rol: Rol.ADMINISTRADOR };

/** Entorno de pruebas con repositorio simulado en memoria. */
function crearEntorno() {
  const salas = new Map<string, SalaGuardada>([
    ["general", { id: 1, nombre: "general" }],
    ["cocina", { id: 2, nombre: "cocina" }],
  ]);
  const mensajes: MensajeGuardado[] = [];
  let siguienteId = 1;

  const repositorio = {
    async buscarSalaPorNombre(nombre: string) {
      return salas.get(nombre) ?? null;
    },
    async guardarMensaje(datos: {
      salaId: number;
      autorId: number;
      autorNombre: string;
      texto: string;
    }) {
      const mensaje: MensajeGuardado = {
        id: siguienteId++,
        salaId: datos.salaId,
        autorId: datos.autorId,
        autorNombre: datos.autorNombre,
        texto: datos.texto,
        enviadoEn: new Date(),
      };
      mensajes.push(mensaje);
      return mensaje;
    },
    async obtenerHistorialDeSala(salaId: number) {
      return mensajes.filter((m) => m.salaId === salaId);
    },
  };

  const deps: DependenciasTiempoReal = {
    repositorio,
  };

  return { deps, salas, mensajes };
}

// ----------------------------------------------------------------- enviarMensaje

test("enviarMensaje: guarda un mensaje válido con autorId y autorNombre tomados de la sesión", async () => {
  const entorno = crearEntorno();
  const mensaje = await enviarMensaje(
    mesero,
    { texto: "Hola equipo", sala: "general" },
    entorno.deps,
  );

  assert.equal(mensaje.autorId, mesero.id);
  assert.equal(mensaje.autorNombre, mesero.nombre);
  assert.equal(mensaje.texto, "Hola equipo");
  assert.equal(mensaje.salaId, 1);
  assert.equal(entorno.mensajes.length, 1);
});

test("enviarMensaje: ignora un autorId o autorNombre falsos que vengan en la entrada", async () => {
  const entorno = crearEntorno();
  const entradaMaliciosa = {
    texto: "Mensaje legítimo",
    autorId: 999,
    autorNombre: "Suplantador",
    sala: "general",
  };

  const mensaje = await enviarMensaje(mesero, entradaMaliciosa, entorno.deps);
  assert.equal(mensaje.autorId, mesero.id);
  assert.notEqual(mensaje.autorId, 999);
  assert.equal(mensaje.autorNombre, mesero.nombre);
  assert.notEqual(mensaje.autorNombre, "Suplantador");
});

test("enviarMensaje: recorta el texto y elimina caracteres de control", async () => {
  const entorno = crearEntorno();
  const textoConControlYEspacios = "  Mensaje con control \u0000\u0007 y espacios  ";
  const mensaje = await enviarMensaje(mesero, { texto: textoConControlYEspacios }, entorno.deps);

  assert.equal(mensaje.texto, "Mensaje con control  y espacios");
});

test("enviarMensaje: rechaza texto vacío o de solo espacios", async () => {
  const entorno = crearEntorno();

  await assert.rejects(enviarMensaje(mesero, { texto: "" }, entorno.deps), (error: unknown) => {
    assert.ok(error instanceof ErrorValidacion);
    assert.ok(error.campos.texto?.length);
    return true;
  });

  await assert.rejects(
    enviarMensaje(mesero, { texto: "     " }, entorno.deps),
    (error: unknown) => {
      assert.ok(error instanceof ErrorValidacion);
      assert.ok(error.campos.texto?.length);
      return true;
    },
  );
});

test("enviarMensaje: rechaza un mensaje hecho solo de caracteres invisibles", async () => {
  const entorno = crearEntorno();
  const textoInvisible = "\u200B\u2060\uFEFF   \u200B";

  await assert.rejects(
    enviarMensaje(mesero, { texto: textoInvisible }, entorno.deps),
    (error: unknown) => {
      assert.ok(error instanceof ErrorValidacion);
      assert.ok(error.campos.texto?.length);
      return true;
    },
  );
});

test("enviarMensaje: rechaza más de 1000 caracteres y acepta exactamente 1000", async () => {
  const entorno = crearEntorno();
  const exactosMil = "a".repeat(1000);
  const milUno = "a".repeat(1001);

  const mensaje = await enviarMensaje(mesero, { texto: exactosMil }, entorno.deps);
  assert.equal(mensaje.texto.length, 1000);

  await assert.rejects(enviarMensaje(mesero, { texto: milUno }, entorno.deps), (error: unknown) => {
    assert.ok(error instanceof ErrorValidacion);
    return true;
  });
});

test("enviarMensaje: usa la sala general si no se indica sala", async () => {
  const entorno = crearEntorno();
  const mensaje = await enviarMensaje(mesero, { texto: "Aviso general" }, entorno.deps);

  assert.equal(mensaje.salaId, 1);
});

test("enviarMensaje: lanza ErrorNoEncontrado si la sala no existe", async () => {
  const entorno = crearEntorno();

  await assert.rejects(
    enviarMensaje(mesero, { texto: "Hola", sala: "sala_inexistente" }, entorno.deps),
    (error: unknown) => {
      assert.ok(error instanceof ErrorNoEncontrado);
      assert.equal((error as ErrorNoEncontrado).message, "La sala no existe.");
      return true;
    },
  );
});

test("enviarMensaje: devuelve el mensaje guardado", async () => {
  const entorno = crearEntorno();
  const resultado = await enviarMensaje(mesero, { texto: "Mensaje devuelto" }, entorno.deps);

  assert.ok(resultado.id > 0);
  assert.equal(resultado.texto, "Mensaje devuelto");
  assert.ok(resultado.enviadoEn instanceof Date);
});

// ----------------------------------------------------------------- obtenerHistorial

test("obtenerHistorial: devuelve el historial de la sala", async () => {
  const entorno = crearEntorno();
  await enviarMensaje(mesero, { texto: "Primero", sala: "general" }, entorno.deps);
  await enviarMensaje(cocina, { texto: "Segundo", sala: "general" }, entorno.deps);

  const historial = await obtenerHistorial(mesero, "general", entorno.deps);
  assert.equal(historial.length, 2);
  assert.equal(historial[0]?.texto, "Primero");
  assert.equal(historial[1]?.texto, "Segundo");
});

test("obtenerHistorial: funciona para los cuatro roles", async () => {
  const entorno = crearEntorno();
  await enviarMensaje(mesero, { texto: "Mensaje de prueba" }, entorno.deps);

  for (const usuario of [mesero, cocina, cajero, admin]) {
    const historial = await obtenerHistorial(usuario, "general", entorno.deps);
    assert.equal(historial.length, 1);
    assert.equal(historial[0]?.texto, "Mensaje de prueba");
  }
});

test("obtenerHistorial: sala inexistente o inválida lanza el error correspondiente", async () => {
  const entorno = crearEntorno();

  await assert.rejects(
    obtenerHistorial(mesero, "sala_inexistente", entorno.deps),
    (error: unknown) => {
      assert.ok(error instanceof ErrorNoEncontrado);
      assert.equal((error as ErrorNoEncontrado).message, "La sala no existe.");
      return true;
    },
  );

  await assert.rejects(obtenerHistorial(mesero, "   ", entorno.deps), (error: unknown) => {
    assert.ok(error instanceof ErrorValidacion);
    return true;
  });

  await assert.rejects(obtenerHistorial(mesero, 12345, entorno.deps), (error: unknown) => {
    assert.ok(error instanceof ErrorValidacion);
    return true;
  });
});
