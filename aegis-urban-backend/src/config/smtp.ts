/**
 * Configuración del envío real de correo (SMTP). Solo se exige cuando
 * VERIFICACION_EMAIL_REAL=true. Función pura: devuelve los problemas encontrados.
 */
export function validarSmtp(vars: Record<string, string | undefined>): string[] {
  const problemas: string[] = [];
  if (!vars.SMTP_HOST) problemas.push("SMTP_HOST no está definido (ej: smtp.gmail.com)");
  const puerto = Number(vars.SMTP_PORT);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) problemas.push("SMTP_PORT debe ser un puerto válido (ej: 465)");
  if (!vars.SMTP_USER) problemas.push("SMTP_USER no está definido");
  if (!vars.SMTP_PASS) problemas.push("SMTP_PASS no está definido (en Gmail es una contraseña de aplicación)");
  if (!vars.SMTP_FROM || !vars.SMTP_FROM.includes("@")) problemas.push('SMTP_FROM debe ser una dirección de correo (ej: "AEGIS Urban <tu@gmail.com>")');
  return problemas;
}
