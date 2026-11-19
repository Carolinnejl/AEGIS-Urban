import { test, expect, type Page } from "@playwright/test";

const USUARIO = process.env.TEST_ADMIN_USER ?? "admin";
const CLAVE = process.env.TEST_ADMIN_PASS ?? "Admin2026!"; // valor del seed de desarrollo

async function ingresar(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/usuario/i).fill(USUARIO);
  await page.getByLabel(/contraseña/i).fill(CLAVE);
  await page.getByRole("button", { name: /ingresar|iniciar/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test("1. ciudadanía: ve el clima y los avisos sin cuenta, con su origen", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /ver como ciudadano/i }).click();
  await expect(page).toHaveURL(/ciudadano/);
  await expect(page.getByText(/real|simulado/i).first()).toBeVisible();
  await expect(page.getByText(/911/).first()).toBeVisible();
});

test("2. idioma: cambiar a inglés traduce la interfaz y se recuerda al recargar", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByText("Sign In").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Sign In").first()).toBeVisible();
});

test("3. credenciales inválidas muestran error y no ingresan", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/usuario/i).fill("nadie_existe");
  await page.getByLabel(/contraseña/i).fill("incorrecta");
  await page.getByRole("button", { name: /ingresar|iniciar/i }).click();
  await expect(page).toHaveURL(/login/);
  await expect(page.getByText(/incorrect|inválid|invalid/i).first()).toBeVisible();
});

test("4. una ruta protegida sin sesión redirige al login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/login/);
});

test("5. administrador: ve Administración (patente) y la bitácora verifica la integridad", async ({ page }) => {
  await ingresar(page);
  await page.getByRole("link", { name: /administraci/i }).first().click();
  await page.getByRole("button", { name: /Verificar Integridad/ }).click();
  await expect(page.getByText("Integridad VÁLIDA")).toBeVisible({ timeout: 15_000 });
});

test("6. defensa civil: alerta reconocida → plan de evacuación", async ({ page, request }) => {
  // Preparación por API: reconoce las alertas activas, para que cualquier botón «Iniciar evacuación» sea válido.
  const API = process.env.E2E_API ?? "http://localhost:3001";
  const login = await request.post(`${API}/api/auth/login`, { data: { username: USUARIO, password: CLAVE } });
  const token = (await login.json()).token as string;
  const cab = { Authorization: `Bearer ${token}` };
  const lista = await (await request.get(`${API}/api/alertas?pageSize=50`, { headers: cab })).json();
  const alertas = lista.alertas as Array<{ id_alert: number; status: string }>;
  test.skip(alertas.length === 0, "La base todavía no tiene alertas (las generan los sensores simulados)");
  for (const a of alertas.filter((x) => x.status === "ACTIVE")) await request.patch(`${API}/api/alertas/${a.id_alert}/reconocer`, { headers: cab });

  await ingresar(page);
  await page.getByRole("link", { name: /alertas/i }).first().click();
  const evacuar = page.getByRole("button", { name: /iniciar evacuaci/i }).first();
  await evacuar.waitFor({ timeout: 15_000 });
  await evacuar.click();
  await expect(page.getByText(/plan de evacuaci/i).first()).toBeVisible();
  await expect(page.getByText(/radio afectado/i).first()).toBeVisible();
});
