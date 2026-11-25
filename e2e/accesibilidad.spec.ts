/**
 * Accesibilidad (WCAG 2.2 AA) con axe y recorridos con teclado.
 * El servidor de prueba usa el usuario falso de desarrollo con rol MESERO.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ETIQUETAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Analiza la página con axe y devuelve las violaciones en un formato legible. */
async function violaciones(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  return violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    ayuda: v.help,
    elementos: v.nodes.map((n) => n.target.join(" ")).slice(0, 3),
  }));
}

const PANTALLAS = [
  { ruta: "/login", nombre: "inicio de sesión" },
  { ruta: "/registro", nombre: "crear cuenta" },
  { ruta: "/recuperar", nombre: "recuperar clave" },
  { ruta: "/", nombre: "inicio" },
  { ruta: "/ejemplo", nombre: "componentes de ejemplo" },
  { ruta: "/pedidos", nombre: "listado de pedidos" },
  { ruta: "/pedidos/nuevo", nombre: "nuevo pedido" },
  { ruta: "/chat", nombre: "chat general" },
];

for (const { ruta, nombre } of PANTALLAS) {
  test(`axe: ${nombre} (${ruta}) sin violaciones WCAG 2.2 AA`, async ({ page }) => {
    await page.goto(ruta);
    await expect(page.locator("h1")).toBeVisible();
    expect(await violaciones(page)).toEqual([]);
  });
}

test("el botón del ojo muestra y oculta la clave, con teclado, y la oculta al enviar", async ({
  page,
}) => {
  await page.goto("/login");
  const clave = page.getByLabel("Clave", { exact: true });
  const ojo = page.getByRole("button", { name: "Mostrar clave" });
  await clave.fill("clave-de-prueba");
  await expect(clave).toHaveAttribute("type", "password");
  await expect(ojo).toHaveAttribute("aria-pressed", "false");

  await clave.press("Tab");
  await expect(ojo).toBeFocused();
  await ojo.press("Enter");
  await expect(clave).toHaveAttribute("type", "text");
  await expect(ojo).toHaveAttribute("aria-pressed", "true");
  await expect(clave).toHaveValue("clave-de-prueba");

  await ojo.press("Space");
  await expect(clave).toHaveAttribute("type", "password");

  await ojo.click();
  await page.getByLabel(/correo/i).fill("nadie@example.com");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(clave).toHaveAttribute("type", "password");
});

test("el modo claro se aplica en toda la app y se conserva al volver a cargar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/login");
  const interruptor = page.getByRole("switch", { name: "Modo claro" });
  const raiz = page.locator("html");

  await expect(interruptor).toHaveAttribute("aria-checked", "false");
  await interruptor.press("Space");
  await expect(interruptor).toHaveAttribute("aria-checked", "true");
  await expect(raiz).toHaveCSS("color-scheme", "light");

  await page.getByRole("link", { name: "Crear una cuenta" }).click();
  await expect(page).toHaveURL(/\/registro$/);
  await expect(interruptor).toHaveAttribute("aria-checked", "true");
  await expect(raiz).toHaveCSS("color-scheme", "light");

  for (const { ruta } of PANTALLAS) {
    await page.goto(ruta);
    await expect(raiz).toHaveCSS("color-scheme", "light");
    await expect(interruptor).toHaveAttribute("aria-checked", "true");
    expect(await raiz.evaluate((html) => html.scrollWidth), ruta).toBeLessThanOrEqual(320);
    expect(await violaciones(page), ruta).toEqual([]);
  }

  await interruptor.click();
  await expect(raiz).toHaveCSS("color-scheme", "dark");
  await page.reload();
  await expect(raiz).toHaveCSS("color-scheme", "dark");
  await expect(interruptor).toHaveAttribute("aria-checked", "false");
});

test("axe: los errores del formulario siguen siendo accesibles", async ({ page }) => {
  await page.goto("/pedidos/nuevo");
  await page.getByRole("button", { name: "Enviar pedido a cocina" }).click();
  const mesa = page.getByLabel("Mesa");
  await expect(mesa).toHaveAttribute("aria-invalid", "true");
  await expect(mesa).toHaveAccessibleDescription(/Elige la mesa/);
  expect(await violaciones(page)).toEqual([]);
});

test("el catálogo permite buscar y elegir cada producto del pedido por separado", async ({
  page,
}) => {
  await page.goto("/pedidos/nuevo");

  const primeraFila = page.getByRole("group", { name: "Producto 1", exact: true });
  const primerBuscador = primeraFila.getByRole("searchbox");
  await primerBuscador.fill("cafe");
  const cafe = primeraFila.getByRole("radio", { name: /Café pasado/ });
  await primerBuscador.press("Tab");
  await expect(cafe).toBeFocused();
  await cafe.press("Space");
  await expect(cafe).toBeChecked();

  await page.getByRole("button", { name: "Agregar otro producto" }).click();
  const segundaFila = page.getByRole("group", { name: "Producto 2", exact: true });
  const segundoBuscador = segundaFila.getByRole("searchbox");
  await expect(segundoBuscador).toBeFocused();
  await segundoBuscador.fill("sin coincidencias");
  await expect(segundaFila.getByRole("status")).toHaveText(
    "No hay productos que coincidan con la búsqueda.",
  );

  await segundoBuscador.fill("limonada");
  await segundaFila.getByText("Limonada", { exact: true }).click();
  await expect(segundaFila.getByRole("radio", { name: /Limonada/ })).toBeChecked();
  await expect(cafe).toBeChecked();
  await expect(page.locator(".total-estimado")).toContainText("3,75");
});

test("teclado: el primer Tab es 'Saltar al contenido' y lleva al contenido", async ({ page }) => {
  await page.goto("/pedidos");
  await page.keyboard.press("Tab");
  const saltar = page.getByRole("link", { name: "Saltar al contenido" });
  await expect(saltar).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenido")).toBeFocused();
});

test("teclado: el diálogo de confirmación atrapa el foco, Escape cierra y devuelve el foco", async ({
  page,
}) => {
  await page.goto("/ejemplo");
  const abrir = page.getByRole("button", { name: "Cancelar pedido 1000" });
  await abrir.focus();
  await page.keyboard.press("Enter");
  const dialogo = page.getByRole("dialog", { name: "¿Cancelar el pedido 1000?" });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
  expect(await violaciones(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
  await expect(abrir).toBeFocused();
});

test("adaptable: a 320 px no hay desplazamiento horizontal y el menú se pliega", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const ruta of ["/pedidos", "/pedidos/nuevo", "/ejemplo"]) {
    await page.goto(ruta);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho, `scroll horizontal en ${ruta}`).toBeLessThanOrEqual(320);
  }
  const menu = page.getByRole("button", { name: "Menú" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
});

test("permisos: el mesero no puede abrir la pantalla de cocina", async ({ page }) => {
  const respuesta = await page.goto("/cocina");
  expect(respuesta?.status()).toBe(404);

  const calificacion = await page.goto("/calificar/1");
  expect(calificacion?.status()).toBe(404);
});
