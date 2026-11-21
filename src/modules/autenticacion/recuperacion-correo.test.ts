import assert from "node:assert/strict";
import { test } from "node:test";
import type { Mensaje, ResultadoEnvio } from "@/lib/correo";
import { entregarEnlaceRecuperacion, plantillaRecuperacion } from "./recuperacion-correo";

const enlace = "https://orderix.example/restablecer-clave?token=abc_123-XYZ";

test("la plantilla incluye el enlace, la caducidad y una versión en texto", () => {
  const { asunto, html, texto } = plantillaRecuperacion({ nombre: "Ana", enlace });
  assert.match(asunto, /Restablece tu clave/);
  assert.ok(html.includes(`href="${enlace}"`));
  assert.match(html, /<html lang="es">/);
  assert.match(html, /30 minutos/);
  assert.ok(texto.includes(enlace));
  assert.match(texto, /30 minutos/);
});

test("un nombre con HTML se escapa: no se puede inyectar código en el correo", () => {
  const { html } = plantillaRecuperacion({ nombre: '<img src=x onerror="robar()">', enlace });
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;robar()&quot;&gt;"));
});

function entorno(resultado: ResultadoEnvio) {
  const enviados: Mensaje[] = [];
  const registro: unknown[][] = [];
  return {
    enviados,
    registro,
    opciones: {
      enviar: async (mensaje: Mensaje) => {
        enviados.push(mensaje);
        return resultado;
      },
      registrar: (...datos: unknown[]) => {
        registro.push(datos);
      },
    },
  };
}

test("con correo configurado se envía a la persona y el enlace NO queda en los registros", async () => {
  const { enviados, registro, opciones } = entorno({ enviado: true });
  await entregarEnlaceRecuperacion({ correo: "ana@example.com", nombre: "Ana" }, enlace, opciones);
  assert.equal(enviados[0]?.para, "ana@example.com");
  assert.ok(!JSON.stringify(registro).includes("token="));
});

test("sin correo configurado el enlace sale en la consola (correo simulado)", async () => {
  const { registro, opciones } = entorno({ enviado: false, motivo: "sin-configurar" });
  await entregarEnlaceRecuperacion({ correo: "ana@example.com", nombre: "Ana" }, enlace, opciones);
  assert.deepEqual(registro, [["Enlace de recuperación de clave:", enlace]]);
});

test("si Brevo falla, se avisa el motivo y el enlace queda en la consola como respaldo", async () => {
  const { registro, opciones } = entorno({ enviado: false, motivo: "Brevo respondió 500" });
  await entregarEnlaceRecuperacion({ correo: "ana@example.com", nombre: "Ana" }, enlace, opciones);
  assert.match(String(registro[0]?.[0]), /No se pudo enviar el correo de recuperación/);
  assert.deepEqual(registro[1], ["Enlace de recuperación de clave:", enlace]);
});
