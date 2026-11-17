import assert from "node:assert/strict";
import { test } from "node:test";
import { nombreCookieSesion, opcionesCookieSesion, tokenDesdeCabeceraCookie } from "./cookie";

process.env.DATABASE_URL ??= "postgresql://x:y@localhost:5432/z";
process.env.SESSION_SECRET = "s".repeat(40);
process.env.APP_URL = "https://orderix.example.com";

test("con HTTPS la cookie de sesión es __Host-, httpOnly, Secure y SameSite=Lax", () => {
  assert.equal(nombreCookieSesion(), "__Host-orderix_sesion");
  const opciones = opcionesCookieSesion(3600);
  assert.equal(opciones.httpOnly, true);
  assert.equal(opciones.secure, true);
  assert.equal(opciones.sameSite, "lax");
  assert.equal(opciones.path, "/");
});

test("el token se lee de la cabecera Cookie y se ignoran cookies con otro nombre", () => {
  const cabecera = "otra=1; __Host-orderix_sesion=abc%3D123; orderix_sesion=falsa";
  assert.equal(tokenDesdeCabeceraCookie(cabecera), "abc=123");
  assert.equal(tokenDesdeCabeceraCookie("orderix_sesion=falsa"), undefined);
  assert.equal(tokenDesdeCabeceraCookie(undefined), undefined);
});
