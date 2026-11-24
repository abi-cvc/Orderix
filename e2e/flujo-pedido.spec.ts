/**
 * Flujo completo de un pedido con tres personas a la vez, cada una con su
 * sesión real (inician sesión por la pantalla de login con la semilla):
 * mesero crea con alergia → cocina recibe el aviso en vivo y avanza →
 * mesero recibe “listo” y entrega → caja cobra → historial completo.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";

// Clave de la semilla de desarrollo (prisma/datos-semilla.ts). Solo existe en local y en el CI.
const CLAVE_SEMILLA = "orderix-demo-2026";

async function entrar(browser: Browser, correo: string): Promise<Page> {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await page.goto("/login");
  await page.getByLabel(/correo/i).fill(correo);
  await page.getByLabel(/clave/i).fill(CLAVE_SEMILLA);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  return page;
}

test("mesero, cocina y caja completan un pedido con alergia, con avisos en tiempo real", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const mesero = await entrar(browser, "mesero@orderix.test");
  const cocina = await entrar(browser, "cocina@orderix.test");
  const caja = await entrar(browser, "cajero@orderix.test");

  // Cocina queda escuchando antes de que llegue el pedido.
  await cocina.goto("/cocina");

  // 1. El mesero crea el pedido con una alergia.
  await mesero.goto("/pedidos/nuevo");
  await mesero.getByLabel("Mesa").selectOption("7");
  await mesero
    .getByRole("group", { name: "Producto 1", exact: true })
    .getByRole("radio")
    .first()
    .check();
  await mesero.locator("#alergias-0").fill("maní");
  await mesero.getByRole("button", { name: "Enviar pedido a cocina" }).click();
  await mesero.waitForURL(/\/pedidos\/\d+\?creado=1/);
  const pedidoId = mesero.url().match(/pedidos\/(\d+)/)![1];

  // 2. A cocina le llega el aviso sin recargar.
  await expect(cocina.locator(".avisos-tiempo-real")).toContainText(
    `Nuevo pedido ${pedidoId} para la mesa 7, con alergias`,
  );

  // 3. Cocina ve la alergia y avanza el pedido paso a paso.
  await cocina.goto(`/pedidos/${pedidoId}`);
  await expect(cocina.locator(".alergia").first()).toContainText("ALERGIA: maní");
  await mesero.goto(`/pedidos/${pedidoId}`);
  await cocina.getByRole("button", { name: "Empezar preparación" }).click();
  await expect(cocina.getByRole("button", { name: "Marcar como listo" })).toBeVisible();
  await cocina.getByRole("button", { name: "Marcar como listo" }).click();

  // 4. Al mesero le llega “listo” en vivo y entrega.
  await expect(mesero.locator(".avisos-tiempo-real")).toContainText(
    `¡El pedido ${pedidoId} de la mesa 7 está listo para entregar!`,
  );
  await mesero.reload();
  await mesero.getByRole("button", { name: "Marcar como entregado" }).click();
  await expect(mesero.getByRole("button", { name: "Marcar como entregado" })).toBeHidden();

  // 5. Caja cobra con confirmación del total.
  await caja.goto(`/pedidos/${pedidoId}`);
  await caja.getByRole("button", { name: /^Cobrar/ }).click();
  const dialogo = caja.getByRole("dialog");
  await expect(dialogo).toContainText("Total a cobrar");
  await dialogo.getByRole("button", { name: /Sí, cobrar/ }).click();
  await expect(caja.getByRole("button", { name: /^Cobrar/ })).toBeHidden();

  // 6. El historial guarda los cinco pasos con quién los hizo.
  await caja.reload();
  const historial = caja.locator(".historial li");
  await expect(historial).toHaveCount(5);
  await expect(historial.nth(0)).toContainText("Lucía Andrade");
  await expect(historial.nth(2)).toContainText("Diego Paredes");
  await expect(historial.nth(4)).toContainText("Sofía Cevallos");

  // 7. El cajero presenta la pantalla al cliente y registra una calificación.
  await caja.setViewportSize({ width: 1024, height: 768 });
  await caja.goto(`/calificar/${pedidoId}`);
  await expect(caja.getByRole("heading", { name: "¿Cómo fue tu experiencia?" })).toBeVisible();
  const opciones = caja.getByRole("radio");
  await expect(opciones).toHaveCount(5);
  await expect(caja.getByRole("button", { name: "Enviar" })).toBeDisabled();
  await opciones.first().focus();
  await caja.keyboard.press("ArrowRight");
  await expect(opciones.nth(1)).toBeChecked();
  const dimensiones = await caja.locator(".calificacion-cara").first().boundingBox();
  expect(dimensiones?.width).toBeGreaterThanOrEqual(72);
  expect(dimensiones?.height).toBeGreaterThanOrEqual(72);
  await opciones.nth(4).check();
  await caja.getByRole("button", { name: "Enviar" }).click();
  await expect(caja.getByRole("heading", { name: "¡Gracias!" })).toBeVisible();
  await caja.getByRole("link", { name: "Volver a Caja" }).click();
  await caja.goto(`/pedidos/${pedidoId}`);
  await expect(caja.getByText("5/5 · Excelente")).toBeVisible();
  await expect(caja.getByRole("link", { name: "Calificar servicio" })).toBeHidden();
});
