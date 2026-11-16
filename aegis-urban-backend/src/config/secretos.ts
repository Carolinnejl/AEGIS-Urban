/**
 * Validación de los secretos criptográficos. Función pura: devuelve la lista de
 * problemas encontrados (vacía si todo está bien) y no termina el proceso.
 * env.ts decide qué hacer con el resultado.
 */
const PLACEHOLDERS = ["REEMPLAZAR", "dev_secret", "change_in_prod", "changeme", "secret"];

export function validarSecretos(vars: Record<string, string | undefined>): string[] {
  const problemas: string[] = [];

  const jwt = vars.JWT_SECRET;
  if (!jwt) {
    problemas.push("JWT_SECRET no está definido");
  } else {
    if (jwt.length < 32) problemas.push("JWT_SECRET debe tener al menos 32 caracteres");
    if (PLACEHOLDERS.some((p) => jwt.toLowerCase().includes(p.toLowerCase()))) {
      problemas.push("JWT_SECRET sigue siendo un valor de ejemplo: generá uno aleatorio");
    }
  }

  const aes = vars.AES_SECRET_KEY;
  if (!aes) problemas.push("AES_SECRET_KEY no está definido");
  else if (!/^[0-9a-fA-F]{64}$/.test(aes)) problemas.push("AES_SECRET_KEY debe tener exactamente 64 caracteres hexadecimales (32 bytes)");

  return problemas;
}
