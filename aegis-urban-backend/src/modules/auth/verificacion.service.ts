import { db } from "../../config/database";
import { env } from "../../config/env";
import { AESCipher } from "../../security/encryption/AESCipher";
import { bitacora } from "../../integrity/BitacoraService";
import { AppError, BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { canalSimulado, obtenerCanal } from "./canales-verificacion";
import {
  CanalVerificacion, ESPERA_REENVIO_S, MAX_CODIGOS_HORA, MAX_INTENTOS, VIGENCIA_MIN,
  enmascararEmail, enmascararTelefono, evaluarIntento, generarCodigo, hashCodigo,
} from "./verificacion";

export interface CodigoEmitido {
  canal:               CanalVerificacion;
  destinoEnmascarado:  string;
  venceEn:             string;
  simulado:            boolean;
  /** Solo en modo simulado: lo muestra la interfaz en una bandeja/SMS de mentira. Nunca en un envío real. */
  codigoSimulado?:     string;
}

export interface EstadoVerificacion {
  emailVerificado:     boolean;
  telefonoVerificado:  boolean;
  verificado:          boolean;
  emailEnmascarado:    string;
  telefonoEnmascarado: string | null;
  /** Qué canales se simulan hoy: el correo puede ser real; el celular siempre es simulado. */
  emailSimulado:       boolean;
  telefonoSimulado:    boolean;
}

interface FilaUsuario {
  email: string; phone_enc: string | null;
  email_verified_at: Date | null; phone_verified_at: Date | null; verified_at: Date | null;
}

const COLUMNA: Record<CanalVerificacion, "email_verified_at" | "phone_verified_at"> = {
  EMAIL: "email_verified_at", PHONE: "phone_verified_at",
};

export class VerificacionService {
  private async usuario(idUsuario: number): Promise<FilaUsuario> {
    const { rows } = await db.consultar<FilaUsuario>(
      `SELECT email, phone_enc, email_verified_at, phone_verified_at, verified_at FROM users WHERE id_user = $1`, [idUsuario]);
    if (!rows[0]) throw new NotFoundError("Usuario no encontrado");
    return rows[0];
  }

  async estado(idUsuario: number): Promise<EstadoVerificacion> {
    const u = await this.usuario(idUsuario);
    return {
      emailVerificado:     u.email_verified_at !== null,
      telefonoVerificado:  u.phone_verified_at !== null,
      verificado:          u.verified_at !== null,
      emailEnmascarado:    enmascararEmail(u.email),
      telefonoEnmascarado: u.phone_enc ? enmascararTelefono(AESCipher.descifrar(u.phone_enc)) : null,
      emailSimulado:       canalSimulado("EMAIL"),
      telefonoSimulado:    canalSimulado("PHONE"),
    };
  }

  /** Genera y "envía" un código nuevo. Invalida los anteriores del mismo canal. */
  async emitir(idUsuario: number, canal: CanalVerificacion): Promise<CodigoEmitido> {
    const u = await this.usuario(idUsuario);
    if (u[COLUMNA[canal]]) throw new BadRequestError("Este dato ya está verificado");
    const destino = canal === "EMAIL" ? u.email : (u.phone_enc ? AESCipher.descifrar(u.phone_enc) : null);
    if (!destino) throw new BadRequestError("No hay un teléfono registrado en esta cuenta");

    const { rows: previos } = await db.consultar<{ ultimo: Date | null; ultima_hora: string }>(
      `SELECT MAX(created_at) AS ultimo, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS ultima_hora
         FROM verification_code WHERE id_user = $1 AND channel = $2`, [idUsuario, canal]);
    const ultimo = previos[0]?.ultimo ? previos[0].ultimo.getTime() : 0;
    const faltan = Math.ceil((ultimo + ESPERA_REENVIO_S * 1000 - Date.now()) / 1000);
    if (faltan > 0) throw new AppError(`Esperá ${faltan} s para pedir otro código.`, 429);
    if (Number(previos[0]?.ultima_hora ?? 0) >= MAX_CODIGOS_HORA) {
      throw new AppError("Pediste demasiados códigos en la última hora. Probá más tarde.", 429);
    }

    const medio = obtenerCanal(canal);
    const codigo = generarCodigo();
    const vence = new Date(Date.now() + VIGENCIA_MIN * 60_000);

    await db.consultar(`DELETE FROM verification_code WHERE id_user = $1 AND channel = $2 AND consumed_at IS NULL`, [idUsuario, canal]);
    await db.consultar(
      `INSERT INTO verification_code (id_user, channel, code_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [idUsuario, canal, hashCodigo(idUsuario, canal, codigo, env.jwt.secret), vence]);
    try {
      await medio.enviar(destino, codigo);
    } catch (e) {
      // Si el envío real falla no dejamos un código que nadie recibió. El detalle va solo al log del servidor.
      await db.consultar(`DELETE FROM verification_code WHERE id_user = $1 AND channel = $2 AND consumed_at IS NULL`, [idUsuario, canal]);
      console.error(`[VERIFICACION] falló el envío del código (${canal}):`, e instanceof Error ? e.message : e);
      throw new AppError("No pudimos enviar el código. Probá de nuevo en unos minutos.", 502);
    }

    return {
      canal,
      destinoEnmascarado: canal === "EMAIL" ? enmascararEmail(destino) : enmascararTelefono(destino),
      venceEn: vence.toISOString(),
      simulado: medio.simulado,
      ...(medio.simulado && { codigoSimulado: codigo }),
    };
  }

  /**
   * Emite el código del celular y el del correo. Si el correo real falla, el registro igual se completa:
   * el celular queda emitido y el correo se puede reenviar desde la pantalla de verificación.
   */
  async emitirAmbos(idUsuario: number): Promise<{ email: CodigoEmitido | null; telefono: CodigoEmitido; avisoEmail?: string }> {
    const telefono = await this.emitir(idUsuario, "PHONE");
    try {
      return { email: await this.emitir(idUsuario, "EMAIL"), telefono };
    } catch (e) {
      return { email: null, telefono, avisoEmail: e instanceof AppError ? e.message : "No pudimos enviar el código al correo." };
    }
  }

  /** Confirma un código. Tras MAX_INTENTOS fallos el código se invalida y hay que pedir otro. */
  async confirmar(idUsuario: number, canal: CanalVerificacion, codigoIngresado: string, ip: string): Promise<EstadoVerificacion> {
    if (!/^\d{6}$/.test(codigoIngresado)) throw new BadRequestError("El código tiene 6 dígitos");

    const { rows } = await db.consultar<{ id_code: number; code_hash: string; attempts: number; expires_at: Date; consumed_at: Date | null }>(
      `SELECT id_code, code_hash, attempts, expires_at, consumed_at FROM verification_code
        WHERE id_user = $1 AND channel = $2 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`, [idUsuario, canal]);
    const fila = rows[0];
    if (!fila) throw new NotFoundError("No hay un código pendiente. Pedí uno nuevo.");

    const resultado = evaluarIntento(
      { codeHash: fila.code_hash, attempts: fila.attempts, expiresAt: fila.expires_at, consumedAt: fila.consumed_at },
      hashCodigo(idUsuario, canal, codigoIngresado, env.jwt.secret));

    if (resultado === "EXPIRADO") throw new AppError("El código venció. Pedí uno nuevo.", 410);
    if (resultado === "BLOQUEADO") throw new AppError("Superaste los intentos permitidos. Pedí un código nuevo.", 429);
    if (resultado === "YA_USADO") throw new AppError("Ese código ya fue usado.", 409);
    if (resultado === "INCORRECTO") {
      await db.consultar(`UPDATE verification_code SET attempts = attempts + 1 WHERE id_code = $1`, [fila.id_code]);
      const quedan = MAX_INTENTOS - fila.attempts - 1;
      throw new BadRequestError(quedan > 0 ? `Código incorrecto. Te quedan ${quedan} intentos.` : "Código incorrecto. Pedí un código nuevo.");
    }

    const cliente = await db.obtenerCliente();
    try {
      await cliente.query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED");
      await cliente.query(`UPDATE verification_code SET consumed_at = NOW() WHERE id_code = $1`, [fila.id_code]);
      await cliente.query(`UPDATE users SET ${COLUMNA[canal]} = NOW() WHERE id_user = $1`, [idUsuario]);
      const { rows: u } = await cliente.query<{ verified_at: Date | null }>(
        `UPDATE users SET verified_at = NOW()
          WHERE id_user = $1 AND email_verified_at IS NOT NULL AND phone_verified_at IS NOT NULL AND verified_at IS NULL
          RETURNING verified_at`, [idUsuario]);
      await bitacora.registrarEventoEnTransaccion(cliente, {
        accion: canal === "EMAIL" ? "EMAIL_VERIFIED" : "PHONE_VERIFIED",
        nombreEntidad: "users", idEntidad: String(idUsuario), idUsuario, direccionIp: ip,
        valoresNuevos: { canal, perfilVerificado: u.length > 0, simulado: canalSimulado(canal) },
      });
      await cliente.query("COMMIT");
    } catch (e) {
      await cliente.query("ROLLBACK");
      throw e;
    } finally {
      cliente.release();
    }
    return this.estado(idUsuario);
  }
}

export const verificacionService = new VerificacionService();
