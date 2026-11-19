import { defineConfig } from "@playwright/test";

// Pruebas de punta a punta con un navegador real (Chrome instalado: no descarga navegadores).
// Requieren backend (:3001) y frontend (:5173) levantados, p. ej. con arrancar.bat.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:5173",
    channel: process.env.E2E_CANAL ?? "chrome",
    headless: true,
    locale: "es-AR",
  },
});
