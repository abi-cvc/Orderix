import assert from "node:assert/strict";
import { test } from "node:test";
import { csrfValido, firmarCsrf } from "./csrf";
import { origenPermitido } from "./peticion";

// Entorno de prueba. env() se valida recién en el primer uso, así que basta con
// definirlo antes de llamar a las funciones (cada archivo de prueba corre aparte).
process.env.DATABASE_URL ??= "postgresql://x:y@localhost:5432/z";
process.env.SESSION_SECRET = "s".repeat(40);
process.env.APP_URL = "https://orderix.example.com";

const cabeceras = (valores: Record<string, string>) => ({
  get: (nombre: string) => valores[nombre] ?? null,
});

test("el token CSRF solo vale para su propia sesión y no se puede alterar", () => {
  const token = firmarCsrf("sesion-a");
  assert.equal(csrfValido("sesion-a", token), true);
  assert.equal(csrfValido("sesion-b", token), false);
  assert.equal(csrfValido("sesion-a", token.slice(0, -1) + "x"), false);
  assert.equal(csrfValido("sesion-a", undefined), false);
  assert.equal(csrfValido("sesion-a", ""), false);
});

test("solo se aceptan peticiones que vienen de APP_URL", () => {
  assert.equal(origenPermitido(cabeceras({ origin: "https://orderix.example.com" })), true);
  assert.equal(
    origenPermitido(cabeceras({ referer: "https://orderix.example.com/pedidos?pagina=2" })),
    true,
  );
  assert.equal(origenPermitido(cabeceras({ origin: "https://malo.com" })), false);
  assert.equal(origenPermitido(cabeceras({ origin: "http://orderix.example.com" })), false);
  assert.equal(
    origenPermitido(cabeceras({ origin: "https://orderix.example.com.malo.com" })),
    false,
  );
  assert.equal(origenPermitido(cabeceras({})), false);
});
