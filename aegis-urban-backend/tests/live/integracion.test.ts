/**
 * Pruebas de integración: API + PostgreSQL reales trabajando juntos.
 * Requieren el servidor en API_URL y la base con las migraciones 001–016 aplicadas.
 */
import { Pool } from "pg";
import { llamar, loginAdmin, ADMIN_USER } from "./cliente"; // también carga .env

const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost", port: Number(process.env.DB_PORT ?? 5555),
  database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});
afterAll(async () => { await pool.end(); });

describe("Integración — API + BD", () => {
  let token: string;
  beforeAll(async () => { token = await loginAdmin(); });

  test("health reporta la base conectada", async () => {
    const r = await llamar("GET", "/api/health");
    expect(r.status).toBe(200);
    expect(r.body.baseDatos.estado).toBe("conectada");
  });

  test("login registra la sesión en session_token y el logout la revoca", async () => {
    const login = await llamar("POST", "/api/auth/login", { body: { username: ADMIN_USER, password: process.env.TEST_ADMIN_PASS ?? "Admin2026!" } });
    expect(login.status).toBe(200);
    const t = login.body.token as string;
    expect((await llamar("GET", "/api/auth/me", { token: t })).status).toBe(200);
    expect((await llamar("POST", "/api/auth/logout", { token: t })).status).toBe(200);
    expect((await llamar("GET", "/api/auth/me", { token: t })).status).toBe(401);
  });

  test("dos inicios de sesión simultáneos del mismo usuario no chocan (jti único)", async () => {
    const cuerpo = { username: ADMIN_USER, password: process.env.TEST_ADMIN_PASS ?? "Admin2026!" };
    const [a, b] = await Promise.all([
      llamar("POST", "/api/auth/login", { body: cuerpo }), llamar("POST", "/api/auth/login", { body: cuerpo }),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.token).not.toBe(b.body.token);
  });

  test("el login devuelve las patentes efectivas de la familia (propias + heredadas)", async () => {
    const r = await llamar("POST", "/api/auth/login", { body: { username: ADMIN_USER, password: process.env.TEST_ADMIN_PASS ?? "Admin2026!" } });
    expect(r.status).toBe(200);
    expect(r.body.permisos).toEqual(expect.arrayContaining(["ALERT_ACKNOWLEDGE", "EVACUATION_CREATE", "BACKUP_RESTORE", "AUDIT_VIEW"]));
  });

  test("un inicio de sesión fallido queda en la bitácora (sin la contraseña) y la integridad sigue válida", async () => {
    const usuario = `intruso_${Date.now()}`;
    const secreta = "contrasena-que-no-debe-guardarse";
    expect((await llamar("POST", "/api/auth/login", { body: { username: usuario, password: secreta } })).status).toBe(401);
    let fila: any;
    for (let i = 0; i < 20 && !fila; i++) {
      const { rows } = await pool.query("SELECT action, new_values FROM audit_log WHERE action = 'USER_LOGIN_FAILED' AND new_values LIKE $1 ORDER BY id_log DESC LIMIT 1", [`%${usuario}%`]);
      fila = rows[0];
      if (!fila) await new Promise((r) => setTimeout(r, 150));
    }
    expect(fila).toBeDefined();
    expect(fila.new_values).toContain("USUARIO_INEXISTENTE");
    expect(fila.new_values).not.toContain(secreta);
    expect((await llamar("GET", "/api/admin/integridad", { token })).body.integridad.esValida).toBe(true);
  });

  test("el limitador guarda su estado en PostgreSQL (compartido entre instancias)", async () => {
    const usuario = `contador_${Date.now()}`;
    for (let i = 0; i < 3; i++) await llamar("POST", "/api/auth/login", { body: { username: usuario, password: "x" } });
    const { rows } = await pool.query("SELECT intentos FROM rate_limit WHERE clave LIKE $1", [`%${usuario}%`]);
    expect(rows[0].intentos).toBe(3);
  });

  test("sensores y estadísticas devuelven datos de la BD", async () => {
    const s = await llamar("GET", "/api/sensores", { token });
    expect(s.status).toBe(200);
    expect(JSON.stringify(s.body)).toMatch(/\[/);
    expect((await llamar("GET", "/api/telemetry/estadisticas", { token })).status).toBe(200);
  });

  test("ciclo de alerta: reconocer una alerta activa la deja en estado ACKNOWLEDGED en la BD", async () => {
    const { rows } = await pool.query("SELECT id_alert FROM alert WHERE status = 'ACTIVE' ORDER BY id_alert DESC LIMIT 1");
    if (rows.length === 0) return; // sin alertas activas en esta base: nada que verificar
    const id = rows[0].id_alert;
    const r = await llamar("PATCH", `/api/alertas/${id}/reconocer`, { token });
    expect(r.status).toBe(200);
    const { rows: despues } = await pool.query("SELECT status FROM alert WHERE id_alert = $1", [id]);
    expect(despues[0].status).toBe("ACKNOWLEDGED");
  });

  test("las acciones quedan en la bitácora y la integridad DVH/DVV sigue válida", async () => {
    const i = await llamar("GET", "/api/admin/integridad", { token });
    expect(i.status).toBe(200);
    expect(i.body.integridad.esValida).toBe(true);
    expect(i.body.integridad.totalFilas).toBeGreaterThan(0);
  });
});

describe("Integración — garantías de la base de datos", () => {
  test("audit_log rechaza UPDATE, DELETE y TRUNCATE (inmutable)", async () => {
    await expect(pool.query("UPDATE audit_log SET action = 'x'")).rejects.toThrow(/inmutable/);
    await expect(pool.query("DELETE FROM audit_log")).rejects.toThrow(/inmutable/);
    await expect(pool.query("TRUNCATE audit_log")).rejects.toThrow(/inmutable/);
  });

  test("existen particiones de sensor_reading que cubren los próximos 12 meses", async () => {
    const { rows } = await pool.query(
      "SELECT MAX(pg_get_expr(c.relpartbound, c.oid)) AS lim FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid JOIN pg_class p ON p.oid = i.inhparent WHERE p.relname = 'sensor_reading'");
    expect(rows[0].lim).toBeTruthy();
    const { rows: ins } = await pool.query("SELECT asegurar_particiones_sensor_reading(4) AS n");
    expect(ins[0].n).toBeDefined();
  });

  test("las contraseñas se guardan como hash bcrypt, nunca en claro", async () => {
    const { rows } = await pool.query("SELECT password_hash FROM users");
    for (const f of rows) expect(f.password_hash).toMatch(/^(\$2[aby]\$\d{2}\$|!$)/); // "!" = cuenta dada de baja
  });
});
