import nodemailer, { Transporter } from "nodemailer";
import { env } from "../../config/env";
import { CanalVerificacion, enmascararEmail, enmascararTelefono } from "./verificacion";
import { construirCorreo } from "./correo-verificacion";

/**
 * Canal de envío de códigos (patrón Strategy).
 *  - EMAIL: real por SMTP si VERIFICACION_EMAIL_REAL=true; si no, simulado.
 *  - PHONE: siempre simulado (no hay proveedor de SMS contratado).
 */
export interface CanalEnvio {
  readonly simulado: boolean;
  enviar(destino: string, codigo: string): Promise<void>;
}

/** ¿Este canal se simula con la configuración actual? */
export function canalSimulado(canal: CanalVerificacion): boolean {
  return canal === "PHONE" || !env.verificacion.emailReal;
}

/** No envía nada: escribe el código en la consola del servidor y la interfaz lo muestra en una bandeja simulada. */
class CanalSimulado implements CanalEnvio {
  readonly simulado = true;
  constructor(private readonly medio: "EMAIL" | "SMS") {}

  async enviar(destino: string, codigo: string): Promise<void> {
    const visible = this.medio === "EMAIL" ? enmascararEmail(destino) : enmascararTelefono(destino);
    console.log(`[SIMULADO] ${this.medio} a ${visible} — código: ${codigo} (no se envió ningún mensaje real)`);
  }
}

/** Envío real por SMTP. No escribe el código en los logs. */
export class CanalEmailSmtp implements CanalEnvio {
  readonly simulado = false;
  constructor(private readonly transporte: Transporter, private readonly remitente: string) {}

  async enviar(destino: string, codigo: string): Promise<void> {
    const { asunto, texto, html } = construirCorreo(codigo);
    await this.transporte.sendMail({ from: this.remitente, to: destino, subject: asunto, text: texto, html });
    console.log(`[EMAIL] código enviado a ${enmascararEmail(destino)}`);
  }
}

let transporteSmtp: Transporter | null = null;
function transporte(): Transporter {
  transporteSmtp ??= nodemailer.createTransport({
    host: env.smtp.host, port: env.smtp.port, secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
  });
  return transporteSmtp;
}

export function obtenerCanal(canal: CanalVerificacion): CanalEnvio {
  if (canal === "EMAIL" && env.verificacion.emailReal) return new CanalEmailSmtp(transporte(), env.smtp.from);
  return new CanalSimulado(canal === "EMAIL" ? "EMAIL" : "SMS");
}
