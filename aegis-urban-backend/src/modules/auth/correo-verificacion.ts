import { VIGENCIA_MIN } from "./verificacion";

export interface Correo { asunto: string; texto: string; html: string }

/** Arma el correo con el código de verificación. Función pura, sin envío. */
export function construirCorreo(codigo: string): Correo {
  const asunto = `Tu código de verificación de AEGIS Urban: ${codigo}`;
  const texto =
    `Tu código de verificación de AEGIS Urban es ${codigo}.\n\n` +
    `Vence en ${VIGENCIA_MIN} minutos. Si no creaste una cuenta en AEGIS Urban, ignorá este mensaje.\n` +
    "Nunca compartas este código con nadie.";
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0B1220">` +
    `<h2 style="margin:0 0 12px">AEGIS Urban</h2>` +
    `<p>Tu código de verificación es:</p>` +
    `<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:12px 0;color:#0891b2">${codigo}</p>` +
    `<p>Vence en ${VIGENCIA_MIN} minutos.</p>` +
    `<p style="color:#64748b;font-size:13px">Si no creaste una cuenta en AEGIS Urban, ignorá este mensaje. Nunca compartas este código con nadie.</p>` +
    `</div>`;
  return { asunto, texto, html };
}
