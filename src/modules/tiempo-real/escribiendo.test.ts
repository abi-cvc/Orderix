import assert from "node:assert/strict";
import { test } from "node:test";
import { Rol } from "@/generated/prisma/enums";
import type { UsuarioSesion } from "@/modules/autenticacion";
import { formatearTextoEscribiendo } from "@/lib/formato";
import {
  notificarEscribiendo,
  type EmisorEscribiendo,
} from "./escribiendo";

test("el evento llega a los demás de la sala mediante broadcast y NO al emisor", () => {
  const eventosEmitidos: { evento: string; datos: unknown }[] = [];
  let broadcastLlamado = false;

  const emisorFalso: EmisorEscribiendo = {
    broadcast: {
      emit(evento, datos) {
        broadcastLlamado = true;
        eventosEmitidos.push({ evento, datos });
      },
    },
  };

  const usuario: UsuarioSesion = { id: 7, nombre: "Lucía", rol: Rol.MESERO };
  const resultado = notificarEscribiendo(emisorFalso, usuario);

  assert.equal(broadcastLlamado, true);
  assert.equal(eventosEmitidos.length, 1);
  assert.equal(eventosEmitidos[0]?.evento, "chat:escribiendo");
  assert.deepEqual(eventosEmitidos[0]?.datos, { usuarioId: 7, nombre: "Lucía" });
  assert.deepEqual(resultado, { usuarioId: 7, nombre: "Lucía" });
});

test("lleva el nombre y el id de la sesión, ignorando cualquier dato del payload del cliente", () => {
  const eventosEmitidos: { evento: string; datos: unknown }[] = [];
  const emisorFalso: EmisorEscribiendo = {
    broadcast: {
      emit(evento, datos) {
        eventosEmitidos.push({ evento, datos });
      },
    },
  };

  const usuarioSesion: UsuarioSesion = { id: 10, nombre: "Carlos", rol: Rol.COCINA };

  // El manejador solo pasa `usuario` de la sesión a `notificarEscribiendo`
  const resultado = notificarEscribiendo(emisorFalso, usuarioSesion);

  assert.equal(resultado.usuarioId, 10);
  assert.equal(resultado.nombre, "Carlos");
  assert.deepEqual(eventosEmitidos[0]?.datos, { usuarioId: 10, nombre: "Carlos" });
});

test("formatearTextoEscribiendo formatea correctamente 0, 1, 2 y 3 o más personas", () => {
  assert.equal(formatearTextoEscribiendo([]), "");
  assert.equal(formatearTextoEscribiendo(["Ana"]), "Ana está escribiendo…");
  assert.equal(formatearTextoEscribiendo(["Ana", "Luis"]), "Ana y Luis están escribiendo…");
  assert.equal(formatearTextoEscribiendo(["Ana", "Luis", "Carlos"]), "Varias personas están escribiendo…");
  assert.equal(
    formatearTextoEscribiendo(["Ana", "Luis", "Carlos", "Sofía"]),
    "Varias personas están escribiendo…",
  );
});
