import type { TFunction } from "i18next";
import type { ZonaRiesgo } from "../services/publico";

/** Códigos del clima (WMO, Open-Meteo) → clave de traducción de `condiciones.*`. */
export function grupoClima(codigo: number): string {
  if (codigo === 0) return "despejado";
  if (codigo <= 2) return "parcial";
  if (codigo === 3) return "nublado";
  if (codigo === 45 || codigo === 48) return "niebla";
  if (codigo >= 51 && codigo <= 57) return "llovizna";
  if (codigo >= 61 && codigo <= 67) return "lluvia";
  if (codigo >= 71 && codigo <= 77) return "nieve";
  if (codigo >= 80 && codigo <= 82) return "chubascos";
  if (codigo === 85 || codigo === 86) return "chubascosNieve";
  if (codigo >= 95) return "tormenta";
  return "variable";
}

/** Nombre traducido del tipo de evento de una zona (inundación, incendio…); si no hay traducción usa el texto del servidor. */
export const tipoDeZona = (t: TFunction, z: Pick<ZonaRiesgo, "tipo" | "tipoCodigo">): string =>
  t(`tipos.${z.tipoCodigo ?? z.tipo}`, { defaultValue: z.tipo });

/** Dirección cardinal ("norte") traducida. */
export const direccionTraducida = (t: TFunction, direccion: string | null): string =>
  direccion ? t(`direcciones.${direccion}`, { defaultValue: direccion }) : "";

/** Etiqueta traducida de una acción de la bitácora (USER_LOGIN → "Sesión iniciada"); si no hay traducción muestra el código. */
export const accionEtiqueta = (t: TFunction, accion: string): string =>
  t(`gestion.acciones.${accion}`, { defaultValue: accion });
