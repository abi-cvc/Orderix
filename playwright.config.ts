import { defineConfig } from "@playwright/test";

/**
 * Pruebas de extremo a extremo y de accesibilidad (axe) en un navegador real.
 *
 * Levanta su propio servidor en el puerto 3100 con el usuario falso de
 * desarrollo (mesero). Requiere la base de datos con la semilla:
 *   docker compose up -d db && npm run db:deploy && npm run db:seed
 * Uso: npm run test:e2e
 */
const PUERTO = 3100;
const URL_BASE = `http://localhost:${PUERTO}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: URL_BASE,
    // Usa el Chrome instalado (en la PC y en GitHub Actions): no descarga navegadores.
    channel: "chrome",
    locale: "es-EC",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx tsx server.ts",
    url: `${URL_BASE}/api/salud`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      PORT: String(PUERTO),
      APP_URL: URL_BASE,
      DEV_FAKE_USER_ROLE: "MESERO",
    },
  },
});
