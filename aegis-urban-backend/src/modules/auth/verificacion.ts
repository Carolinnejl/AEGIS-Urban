import crypto from "crypto";

/** Lógica pura de la verificación por códigos (sin base de datos), para poder testearla. */
export type CanalVerificacion = "EMAIL" | "PHONE";

export const VIGENCIA_MIN      = 10; // minutos de validez de un código
export const MAX_INTENTOS      = 5;  // intentos fallidos antes de invalidar el código
export const ESPERA_REENVIO_S  = 30; // segundos mínimos entre dos códigos del mismo canal
export const MAX_CODIGOS_HORA  = 5;  // códigos por canal por hora

/** Código de 6 dígitos con generador criptográfico. */
export function generarCodigo(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** HMAC del código, atado al usuario y al canal: un código de un canal no sirve en el otro. */
export function hashCodigo(idUsuario: number, canal: CanalVerificacion, codigo: string, secreto: string): string {
  return crypto.createHmac("sha256", secreto).update(`${idUsuario}:${canal}:${codigo}`).digest("hex");
}

export function hashesIguales(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** "vecina@mail.com" → "v••••••@mail.com" */
export function enmascararEmail(email: string): string {
  const [local, dominio] = email.split("@");
  if (!dominio) return "••••";
  return `${local[0] ?? ""}${"•".repeat(Math.max(local.length - 1, 3))}@${dominio}`;
}

/** "+5491122334455" → "•••••••••4455" (deja visibles los últimos 4 dígitos). */
export function enmascararTelefono(telefono: string): string {
  return `${"•".repeat(Math.max(telefono.length - 4, 4))}${telefono.slice(-4)}`;
}

/** Quita espacios, guiones y paréntesis. Devuelve null si no parece un número (8 a 15 dígitos, "+" opcional). */
export function normalizarTelefono(crudo: string): string | null {
  const limpio = crudo.replace(/[\s\-().]/g, "");
  return /^\+?\d{8,15}$/.test(limpio) ? limpio : null;
}

export interface RegistroCodigo {
  codeHash:   string;
  attempts:   number;
  expiresAt:  Date;
  consumedAt: Date | null;
}

export type ResultadoIntento = "OK" | "INCORRECTO" | "EXPIRADO" | "BLOQUEADO" | "YA_USADO";

/** Decide qué pasó con un intento de confirmación. Prioridad: usado → bloqueado → vencido → comparación. */
export function evaluarIntento(registro: RegistroCodigo, hashIngresado: string, ahora = new Date()): ResultadoIntento {
  if (registro.consumedAt) return "YA_USADO";
  if (registro.attempts >= MAX_INTENTOS) return "BLOQUEADO";
  if (registro.expiresAt.getTime() <= ahora.getTime()) return "EXPIRADO";
  return hashesIguales(registro.codeHash, hashIngresado) ? "OK" : "INCORRECTO";
}
