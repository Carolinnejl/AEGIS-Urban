/**
 * Lógica pura de respaldos (sin I/O): nombres, retención, cuándo respaldar y
 * cómo se invocan pg_dump / psql. Se separa del servicio para poder testearla.
 */

/** aegis_YYYYMMDD_HHMMSS.sql.gz, con sufijo opcional "_pre-restore". */
export const PATRON_NOMBRE = /^aegis_\d{8}_\d{6}(_pre-restore)?\.sql\.gz$/;

const dos = (n: number) => String(n).padStart(2, "0");

export function nombreBackup(fecha: Date, sufijo = ""): string {
  const f = `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
  const h = `${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`;
  return `aegis_${f}_${h}${sufijo}.sql.gz`;
}

/** Solo se aceptan nombres con este formato: evita rutas arbitrarias (../) en los endpoints. */
export const esNombreValido = (nombre: string): boolean => PATRON_NOMBRE.test(nombre);

/** Devuelve los respaldos más viejos que exceden la retención (conserva los `retencion` más nuevos). */
export function seleccionarParaBorrar(nombres: string[], retencion: number): string[] {
  const validos = nombres.filter(esNombreValido).sort().reverse(); // el nombre ordena cronológicamente
  return validos.slice(Math.max(retencion, 1));
}

/** ¿Pasaron más de `horas` desde el último respaldo (o no hay ninguno)? */
export function debeCrearBackup(ultimo: Date | null, ahora: Date, horas = 24): boolean {
  return ultimo === null || ahora.getTime() - ultimo.getTime() >= horas * 3_600_000;
}

/** Los nombres de base temporal solo pueden tener este formato (se interpolan en CREATE DATABASE). */
export const esNombreBaseSeguro = (n: string): boolean => /^[a-z][a-z0-9_]{2,62}$/.test(n);

export interface ConfigPg {
  modo:       "docker" | "local";
  contenedor: string;
  host:       string;
  port:       number;
  user:       string;
  password:   string;
}

export interface Comando { cmd: string; args: string[]; env: Record<string, string> }

/**
 * Comando que vuelca una base completa a stdout (SQL plano).
 * --clean --if-exists permite restaurar sobre una base con datos; --no-owner evita
 * depender de quién creó los objetos. NO se usa --no-privileges: los REVOKE que protegen
 * la bitácora (sin UPDATE/DELETE) deben viajar en el respaldo.
 */
export function comandoDump(cfg: ConfigPg, base: string): Comando {
  const comunes = ["-U", cfg.user, "-d", base, "--clean", "--if-exists", "--no-owner"];
  return cfg.modo === "docker"
    ? { cmd: "docker", args: ["exec", cfg.contenedor, "pg_dump", ...comunes], env: {} }
    : { cmd: "pg_dump", args: ["-h", cfg.host, "-p", String(cfg.port), ...comunes], env: { PGPASSWORD: cfg.password } };
}

/** Comando que lee SQL por stdin y lo aplica en una sola transacción (si algo falla no queda nada a medias). */
export function comandoPsql(cfg: ConfigPg, base: string): Comando {
  const comunes = ["-U", cfg.user, "-d", base, "-v", "ON_ERROR_STOP=1", "-q", "-1"];
  return cfg.modo === "docker"
    ? { cmd: "docker", args: ["exec", "-i", cfg.contenedor, "psql", ...comunes], env: {} }
    : { cmd: "psql", args: ["-h", cfg.host, "-p", String(cfg.port), ...comunes], env: { PGPASSWORD: cfg.password } };
}
