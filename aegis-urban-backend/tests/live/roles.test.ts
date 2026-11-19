/**
 * Pruebas por rol: cada familia entra con su usuario del seed 003 y se comprueba, contra la API real,
 * qué puede y qué no puede hacer. Un 403 significa "autenticado pero sin patente".
 */
import { llamar } from "./cliente";

const CLAVE = process.env.TEST_ROL_PASS ?? "Aegis2026!"; // valor del seed de desarrollo

// Cada rol entra una sola vez: el limitador de login cuenta cada intento.
const tokens = new Map<string, string>();
async function token(usuario: string): Promise<string> {
  const guardado = tokens.get(usuario);
  if (guardado) return guardado;
  const r = await llamar("POST", "/api/auth/login", { body: { username: usuario, password: CLAVE } });
  if (r.status !== 200) throw new Error(`No se pudo entrar como ${usuario} (${r.status}). ¿Aplicaste database/seeds/003_usuarios_por_rol.sql?`);
  tokens.set(usuario, r.body.token);
  return r.body.token;
}

// [método, ruta] → quién puede (el resto debe recibir 403). 404/400/409 también cuentan como "autorizado":
// lo que se prueba es que la autorización no bloquee, no el resultado del negocio.
const ES_403 = (s: number) => s === 403;
const MATRIZ: Array<{ m: string; ruta: string; quien: string[]; que: string }> = [
  { m: "GET",   ruta: "/api/sensores",                  quien: ["admin", "transito", "defensa", "auditor"], que: "ver sensores" },
  { m: "GET",   ruta: "/api/alertas",                   quien: ["admin", "transito", "defensa", "auditor"], que: "ver alertas" },
  { m: "GET",   ruta: "/api/telemetry/estadisticas",    quien: ["admin", "transito", "defensa", "auditor"], que: "ver el panel" },
  { m: "PATCH", ruta: "/api/alertas/0/reconocer",       quien: ["admin", "defensa"],                                    que: "reconocer alertas" },
  { m: "PATCH", ruta: "/api/alertas/0/resolver",        quien: ["admin", "defensa"],                                    que: "resolver alertas" },
  { m: "POST",  ruta: "/api/alertas/0/evacuar",         quien: ["admin", "defensa"],                                    que: "iniciar evacuaciones" },
  { m: "GET",   ruta: "/api/simulation/scenarios",      quien: ["admin", "defensa"],                                    que: "ver escenarios de simulación" },
  { m: "POST",  ruta: "/api/sensores/0/simular",        quien: ["admin", "defensa"],                                    que: "forzar lecturas simuladas" },
  { m: "GET",   ruta: "/api/admin/bitacora",            quien: ["admin", "auditor"],                                    que: "consultar la bitácora" },
  { m: "GET",   ruta: "/api/admin/integridad",          quien: ["admin", "auditor"],                                    que: "verificar la integridad" },
  { m: "GET",   ruta: "/api/admin/usuarios",            quien: ["admin"],                                               que: "ver usuarios" },
  { m: "GET",   ruta: "/api/admin/familias",            quien: ["admin"],                                               que: "ver familias" },
  { m: "GET",   ruta: "/api/admin/backups",             quien: ["admin"],                                               que: "ver respaldos" },
  { m: "POST",  ruta: "/api/admin/backups/x/restaurar", quien: ["admin"],                                               que: "restaurar un respaldo" },
];
const ROLES = ["admin", "transito", "defensa", "auditor"];

describe("Autorización por rol (API real)", () => {
  beforeAll(async () => {
    // admin ya tiene su propia clave en el seed 001
    const r = await llamar("POST", "/api/auth/login", { body: { username: "admin", password: process.env.TEST_ADMIN_PASS ?? "Admin2026!" } });
    tokens.set("admin", r.body.token);
  });

  for (const c of MATRIZ) {
    for (const rol of ROLES) {
      const permitido = c.quien.includes(rol);
      test(`${rol} ${permitido ? "PUEDE" : "NO puede"} ${c.que} (${c.m} ${c.ruta})`, async () => {
        const r = await llamar(c.m, c.ruta, { token: await token(rol) });
        if (permitido) expect(ES_403(r.status)).toBe(false);
        else expect(r.status).toBe(403);
      });
    }
  }

  test("el login de cada rol devuelve sus propias patentes", async () => {
    const pat = async (u: string) => {
      const r = await llamar("POST", "/api/auth/login", { body: { username: u, password: CLAVE } });
      return new Set<string>(r.body.permisos);
    };
    const defensa = await pat("defensa"), transito = await pat("transito"), auditor = await pat("auditor");
    expect(defensa.has("EVACUATION_CREATE")).toBe(true);
    expect(transito.has("EVACUATION_CREATE")).toBe(false);
    expect(auditor.has("AUDIT_VIEW")).toBe(true);
    expect(transito.has("AUDIT_VIEW")).toBe(false);
    // DEFENSA_CIVIL hereda de TRANSITO (Composite): tiene todas sus patentes y más.
    for (const patente of transito) expect(defensa.has(patente)).toBe(true);
    expect(defensa.size).toBeGreaterThan(transito.size);
  });

  test("la familia OPERADOR_CRISIS ya no existe (unificada en TRANSITO)", async () => {
    const r = await llamar("POST", "/api/auth/login", { body: { username: "transito", password: CLAVE } });
    expect(r.body.user.familyName).toBe("TRANSITO");
  });
});
