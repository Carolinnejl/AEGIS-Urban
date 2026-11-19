import { db } from "../../config/database";

/**
 * Estado compartido entre instancias, guardado en PostgreSQL (migración 017).
 * Si la base falla, cada función degrada a memoria local en vez de tumbar la petición.
 */

// ── Limitador de tasa ────────────────────────────────────────────────────────
const locales = new Map<string, { n: number; reinicia: number }>();

/** Cuenta un intento atómicamente (una sola sentencia) y devuelve el total en la ventana vigente. */
export async function contarIntento(clave: string, ventanaMs: number): Promise<{ intentos: number; reintentarEnS: number }> {
  try {
    const { rows } = await db.consultar<{ intentos: number; seg: string }>(
      `INSERT INTO rate_limit (clave, intentos, reinicia)
       VALUES ($1, 1, now() + ($2 || ' milliseconds')::interval)
       ON CONFLICT (clave) DO UPDATE SET
         intentos = CASE WHEN rate_limit.reinicia <= now() THEN 1 ELSE rate_limit.intentos + 1 END,
         reinicia = CASE WHEN rate_limit.reinicia <= now() THEN now() + ($2 || ' milliseconds')::interval ELSE rate_limit.reinicia END
       RETURNING intentos, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (reinicia - now()))))::text AS seg`,
      [clave, String(ventanaMs)],
    );
    return { intentos: rows[0].intentos, reintentarEnS: Number(rows[0].seg) };
  } catch {
    const ahora = Date.now();
    const c = locales.get(clave);
    if (!c || c.reinicia <= ahora) { locales.set(clave, { n: 1, reinicia: ahora + ventanaMs }); return { intentos: 1, reintentarEnS: 0 }; }
    c.n += 1;
    return { intentos: c.n, reintentarEnS: Math.ceil((c.reinicia - ahora) / 1000) };
  }
}

// ── Caché compartida con TTL ─────────────────────────────────────────────────
const cacheLocal = new Map<string, { valor: unknown; expira: number }>();

export async function cacheLeer<T>(clave: string): Promise<{ valor: T | null; vigente: boolean } | null> {
  try {
    const { rows } = await db.consultar<{ valor: T | null; vigente: boolean }>(
      "SELECT valor, expira > now() AS vigente FROM shared_cache WHERE clave = $1", [clave]);
    return rows[0] ? { valor: rows[0].valor, vigente: rows[0].vigente } : null;
  } catch {
    const l = cacheLocal.get(clave);
    return l ? { valor: l.valor as T | null, vigente: l.expira > Date.now() } : null;
  }
}

export async function cacheEscribir(clave: string, valor: unknown, ttlMs: number): Promise<void> {
  try {
    await db.consultar(
      `INSERT INTO shared_cache (clave, valor, expira) VALUES ($1, $2::jsonb, now() + ($3 || ' milliseconds')::interval)
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, expira = EXCLUDED.expira`,
      [clave, JSON.stringify(valor), String(ttlMs)]);
  } catch {
    cacheLocal.set(clave, { valor, expira: Date.now() + ttlMs });
  }
}

/** Borra filas vencidas; se llama desde el ciclo de mantenimiento. */
export async function limpiarVencidos(): Promise<void> {
  try {
    await db.consultar("DELETE FROM rate_limit WHERE reinicia <= now()");
    await db.consultar("DELETE FROM shared_cache WHERE expira <= now() - interval '1 day'");
  } catch { /* se reintenta en el próximo ciclo */ }
}
