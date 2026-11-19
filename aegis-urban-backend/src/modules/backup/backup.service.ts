import fs from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import { Client } from "pg";
import { db } from "../../config/database";
import { env } from "../../config/env";
import { AppError, BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { bitacora, integridadDesdeFilas, SQL_FILAS_BITACORA, FilaBitacoraCruda } from "../../integrity/BitacoraService";
import {
  Comando, ConfigPg, comandoDump, comandoPsql, esNombreBaseSeguro, esNombreValido, nombreBackup, seleccionarParaBorrar,
} from "./backup.util";

export interface ManifiestoBackup {
  archivo:   string;
  creado:    string;
  bytes:     number;
  sha256:    string;
  base:      string;
  modo:      string;
  /** Estado de la bitácora (DVH/DVV) en el momento de respaldar. */
  integridad: { esValida: boolean; totalFilas: number };
}

export interface ResultadoSimulacro {
  archivo:     string;
  checksumOk:  boolean;
  integridad:  { esValida: boolean; totalFilas: number; motivo: string };
  tablas:      Record<string, number>;
  duracionMs:  number;
}

interface Contexto { idUsuario: number | null; ip: string }

const TABLAS_CONTROL = ["users", "alert", "sensor", "sensor_reading", "evacuation_plan", "audit_log"] as const;

export class BackupService {
  private cfg(): ConfigPg {
    return {
      modo: env.backup.modo, contenedor: env.backup.contenedor,
      host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
    };
  }

  private ruta(nombre: string): string {
    if (!esNombreValido(nombre)) throw new BadRequestError("Nombre de respaldo inválido");
    return path.join(env.backup.dir, nombre);
  }

  /** Ejecuta un comando y espera su fin; devuelve stderr. Sin shell: los argumentos no se interpretan. */
  private lanzar(c: Comando, stdio: ["ignore" | "pipe", "pipe" | "ignore", "pipe"]) {
    const proc = spawn(c.cmd, c.args, { env: { ...process.env, ...c.env }, stdio });
    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += String(d); });
    const fin = new Promise<void>((resolve, reject) => {
      proc.on("error", (e) => reject(new AppError(`No se pudo ejecutar ${c.cmd}: ${e.message}`, 500)));
      proc.on("close", (code) => (code === 0 ? resolve() : reject(new AppError(`${c.cmd} terminó con código ${code}: ${stderr.trim().slice(0, 400)}`, 500))));
    });
    return { proc, fin };
  }

  async listar(): Promise<ManifiestoBackup[]> {
    await fs.promises.mkdir(env.backup.dir, { recursive: true });
    const nombres = (await fs.promises.readdir(env.backup.dir)).filter(esNombreValido).sort().reverse();
    const out: ManifiestoBackup[] = [];
    for (const n of nombres) {
      const m = await this.leerManifiesto(n);
      if (m) out.push(m);
      else {
        const st = await fs.promises.stat(this.ruta(n));
        out.push({ archivo: n, creado: st.mtime.toISOString(), bytes: st.size, sha256: "", base: env.db.name, modo: "?", integridad: { esValida: false, totalFilas: 0 } });
      }
    }
    return out;
  }

  private async leerManifiesto(nombre: string): Promise<ManifiestoBackup | null> {
    try { return JSON.parse(await fs.promises.readFile(this.ruta(nombre) + ".json", "utf8")); } catch { return null; }
  }

  async ultimo(): Promise<ManifiestoBackup | null> {
    return (await this.listar()).find((b) => !b.archivo.includes("_pre-restore")) ?? null;
  }

  /** Crea un respaldo comprimido de la base completa y registra su huella (SHA-256) y el estado de la bitácora. */
  async crear(ctx?: Contexto, sufijo = ""): Promise<ManifiestoBackup> {
    await fs.promises.mkdir(env.backup.dir, { recursive: true });
    const nombre = nombreBackup(new Date(), sufijo);
    const final = this.ruta(nombre);
    const tmp = final + ".tmp";

    const { proc, fin } = this.lanzar(comandoDump(this.cfg(), env.db.name), ["ignore", "pipe", "pipe"]);
    try {
      await Promise.all([pipeline(proc.stdout!, zlib.createGzip(), fs.createWriteStream(tmp)), fin]);
    } catch (e) {
      await fs.promises.rm(tmp, { force: true });
      throw e;
    }
    await fs.promises.rename(tmp, final);

    const integ = await bitacora.verificarIntegridad();
    const { rows } = await db.consultar<{ total: string }>("SELECT COUNT(*) AS total FROM audit_log");
    const manifiesto: ManifiestoBackup = {
      archivo: nombre, creado: new Date().toISOString(), bytes: (await fs.promises.stat(final)).size,
      sha256: await this.sha256(final), base: env.db.name, modo: env.backup.modo,
      integridad: { esValida: integ.esValida, totalFilas: Number(rows[0].total) },
    };
    await fs.promises.writeFile(final + ".json", JSON.stringify(manifiesto, null, 2));

    await bitacora.registrarEvento({
      accion: "BACKUP_CREATED", nombreEntidad: "backup", idEntidad: nombre,
      idUsuario: ctx?.idUsuario ?? null, direccionIp: ctx?.ip ?? "sistema",
      valoresNuevos: { bytes: manifiesto.bytes, sha256: manifiesto.sha256, automatico: !ctx },
    });
    return manifiesto;
  }

  private sha256(archivo: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const h = crypto.createHash("sha256");
      fs.createReadStream(archivo).on("data", (d) => h.update(d)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
    });
  }

  /** Comprueba que el archivo no fue alterado desde que se creó (huella SHA-256 del manifiesto). */
  async verificarArchivo(nombre: string): Promise<boolean> {
    const ruta = this.ruta(nombre);
    if (!fs.existsSync(ruta)) throw new NotFoundError("El respaldo no existe");
    const m = await this.leerManifiesto(nombre);
    return m !== null && m.sha256 === (await this.sha256(ruta));
  }

  /** Aplica el respaldo (SQL gzip) sobre `base` en UNA transacción: si falla, no queda nada a medias. */
  private async aplicarEn(base: string, nombre: string): Promise<void> {
    const { proc, fin } = this.lanzar(comandoPsql(this.cfg(), base), ["pipe", "ignore", "pipe"]);
    await Promise.all([pipeline(fs.createReadStream(this.ruta(nombre)), zlib.createGunzip(), proc.stdin!), fin]);
  }

  /** Lee la bitácora y las cantidades de filas de OTRA base (la restaurada) con una conexión aparte. */
  private async inspeccionar(base: string) {
    const cliente = new Client({ host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, database: base });
    await cliente.connect();
    try {
      const filas = await cliente.query<FilaBitacoraCruda>(SQL_FILAS_BITACORA);
      const tablas: Record<string, number> = {};
      for (const t of TABLAS_CONTROL) tablas[t] = Number((await cliente.query(`SELECT COUNT(*) AS n FROM ${t}`)).rows[0].n);
      return { integridad: integridadDesdeFilas(filas.rows), tablas };
    } finally {
      await cliente.end();
    }
  }

  /**
   * Simulacro de restauración: restaura el respaldo en una base TEMPORAL, verifica la integridad
   * DVH/DVV y las cantidades, y la borra. Prueba que el respaldo sirve sin tocar la base en uso.
   */
  async simulacro(nombre: string, ctx?: Contexto): Promise<ResultadoSimulacro> {
    const inicio = Date.now();
    const checksumOk = await this.verificarArchivo(nombre);
    const temp = `aegis_simulacro_${Date.now()}`;
    if (!esNombreBaseSeguro(temp)) throw new AppError("Nombre de base temporal inválido", 500);

    await db.consultar(`CREATE DATABASE ${temp}`);
    try {
      await this.aplicarEn(temp, nombre);
      const { integridad, tablas } = await this.inspeccionar(temp);
      const resultado: ResultadoSimulacro = {
        archivo: nombre, checksumOk, duracionMs: Date.now() - inicio, tablas,
        integridad: { esValida: integridad.esValida, totalFilas: tablas.audit_log, motivo: integridad.motivo },
      };
      await bitacora.registrarEvento({
        accion: "BACKUP_RESTORE_DRILL", nombreEntidad: "backup", idEntidad: nombre,
        idUsuario: ctx?.idUsuario ?? null, direccionIp: ctx?.ip ?? "sistema",
        valoresNuevos: { checksumOk, integridadValida: integridad.esValida, tablas },
      });
      return resultado;
    } finally {
      await db.consultar(`DROP DATABASE IF EXISTS ${temp} WITH (FORCE)`);
    }
  }

  /**
   * Restaura el respaldo sobre `baseDestino` (por defecto la base en uso). Exige confirmación escrita,
   * toma antes un respaldo de seguridad ("_pre-restore") y verifica la integridad al terminar.
   */
  async restaurar(nombre: string, confirmar: string, ctx: Contexto, baseDestino = env.db.name) {
    if (confirmar !== "RESTAURAR") throw new BadRequestError('Para restaurar hay que enviar confirmar: "RESTAURAR"');
    if (!(await this.verificarArchivo(nombre))) throw new AppError("El respaldo está alterado o no tiene huella: no se restaura", 409);

    const enUso = baseDestino === env.db.name;
    const seguridad = enUso ? await this.crear(ctx, "_pre-restore") : null;
    await this.aplicarEn(baseDestino, nombre);

    const { integridad, tablas } = await this.inspeccionar(baseDestino);
    if (enUso) {
      await bitacora.registrarEvento({
        accion: "BACKUP_RESTORED", nombreEntidad: "backup", idEntidad: nombre,
        idUsuario: ctx.idUsuario, direccionIp: ctx.ip,
        valoresNuevos: { respaldoDeSeguridad: seguridad?.archivo, integridadValida: integridad.esValida },
      });
    }
    return { archivo: nombre, respaldoDeSeguridad: seguridad?.archivo ?? null, integridad, tablas };
  }

  /** Borra los respaldos más viejos que exceden la retención. */
  async aplicarRetencion(): Promise<string[]> {
    const nombres = (await this.listar()).map((b) => b.archivo);
    const borrar = seleccionarParaBorrar(nombres, env.backup.retencion);
    for (const n of borrar) {
      await fs.promises.rm(this.ruta(n), { force: true });
      await fs.promises.rm(this.ruta(n) + ".json", { force: true });
    }
    return borrar;
  }
}

export const backupService = new BackupService();
