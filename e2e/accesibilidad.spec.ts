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
  { ruta: "/", nombre: "inicio" },
  { ruta: "/ejemplo", nombre: "componentes de ejemplo" },
  { ruta: "/pedidos", nombre: "listado de pedidos" },
  { ruta: "/pedidos/nuevo", nombre: "nuevo pedido" },
];

for (const { ruta, nombre } of PANTALLAS) {
  test(`axe: ${nombre} (${ruta}) sin violaciones WCAG 2.2 AA`, async ({ page }) => {
    await page.goto(ruta);
    await expect(page.locator("h1")).toBeVisible();
    expect(await violaciones(page)).toEqual([]);
  });
}

test("axe: los errores del formulario siguen siendo accesibles", async ({ page }) => {
  await page.goto("/pedidos/nuevo");
  await page.getByRole("button", { name: "Enviar pedido a cocina" }).click();
  const mesa = page.getByLabel("Mesa");
  await expect(mesa).toHaveAttribute("aria-invalid", "true");
  await expect(mesa).toHaveAccessibleDescription(/Elige la mesa/);
  expect(await violaciones(page)).toEqual([]);
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
});
