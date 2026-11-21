import assert from "node:assert/strict";
import { test } from "node:test";
import { enviarCorreo, type ConfigCorreo } from "./correo";

const config: ConfigCorreo = {
  apiKey: "clave-de-prueba",
  remitente: "orderix@example.com",
  nombreRemitente: "Orderix",
};
const mensaje = { para: "ana@example.com", asunto: "Hola", html: "<p>Hola</p>", texto: "Hola" };

function fetchFalso(respuesta: { status: number } | Error) {
  const llamadas: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    if (respuesta instanceof Error) throw respuesta;
    return new Response(null, { status: respuesta.status });
  }) as unknown as typeof fetch;
  return { fn, llamadas };
}

test("sin configuración no llama a Brevo e informa el motivo", async () => {
  const { fn, llamadas } = fetchFalso({ status: 201 });
  assert.deepEqual(await enviarCorreo(mensaje, { config: null, fetch: fn }), {
    enviado: false,
    motivo: "sin-configurar",
  });
  assert.equal(llamadas.length, 0);
});

test("envía a Brevo el remitente, el destinatario y las dos versiones del mensaje", async () => {
  const { fn, llamadas } = fetchFalso({ status: 201 });
  assert.deepEqual(await enviarCorreo(mensaje, { config, fetch: fn }), { enviado: true });

  const [llamada] = llamadas;
  assert.equal(llamada?.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal((llamada?.init.headers as Record<string, string>)["api-key"], "clave-de-prueba");
  assert.deepEqual(JSON.parse(String(llamada?.init.body)), {
    sender: { email: "orderix@example.com", name: "Orderix" },
    to: [{ email: "ana@example.com" }],
    subject: "Hola",
    htmlContent: "<p>Hola</p>",
    textContent: "Hola",
  });
});

test("un error de Brevo o de red no lanza: devuelve el motivo sin la clave", async () => {
  const rechazado = await enviarCorreo(mensaje, { config, fetch: fetchFalso({ status: 401 }).fn });
  assert.deepEqual(rechazado, { enviado: false, motivo: "Brevo respondió 401" });

  const sinRed = await enviarCorreo(mensaje, {
    config,
    fetch: fetchFalso(new TypeError("fetch failed")).fn,
  });
  assert.equal(sinRed.enviado, false);
  assert.ok(!JSON.stringify(sinRed).includes("clave-de-prueba"));
});
