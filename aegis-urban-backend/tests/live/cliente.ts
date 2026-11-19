// Utilidades para las pruebas "en vivo": se ejecutan contra un servidor ya levantado (API_URL).
import "dotenv/config";
export const API_URL = process.env.API_URL ?? "http://localhost:3001";
export const ADMIN_USER = process.env.TEST_ADMIN_USER ?? "admin";
export const ADMIN_PASS = process.env.TEST_ADMIN_PASS ?? "Admin2026!"; // valor del seed de desarrollo

export interface Resp { status: number; headers: Headers; body: any }

export async function llamar(
  metodo: string, ruta: string, opciones: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Resp> {
  const headers: Record<string, string> = { ...(opciones.headers ?? {}) };
  if (opciones.token) headers.Authorization = `Bearer ${opciones.token}`;
  if (opciones.body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo, headers, body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });
  const texto = await r.text();
  let body: any = texto;
  try { body = JSON.parse(texto); } catch { /* no es JSON */ }
  return { status: r.status, headers: r.headers, body };
}

let tokenAdmin: string | undefined;

/** Un solo login por archivo de pruebas: el limitador de la API cuenta cada intento de inicio de sesión. */
export async function loginAdmin(): Promise<string> {
  if (tokenAdmin) return tokenAdmin;
  const r = await llamar("POST", "/api/auth/login", { body: { username: ADMIN_USER, password: ADMIN_PASS } });
  if (r.status !== 200) throw new Error(`No se pudo iniciar sesión como admin (${r.status}). ¿Está levantado el servidor en ${API_URL} con los seeds?`);
  tokenAdmin = r.body.token as string;
  return tokenAdmin;
}
