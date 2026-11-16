import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

/** Contador de intentos por clave en una ventana fija de tiempo. Puro y testeable. */
export class ContadorVentana {
  private readonly cuentas = new Map<string, { n: number; reinicia: number }>();

  constructor(private readonly ventanaMs: number, private readonly max: number) {}

  /** Registra un intento. Si supera el máximo, devuelve cuántos segundos faltan para reintentar. */
  intentar(clave: string, ahora = Date.now()): { permitido: boolean; reintentarEnS: number } {
    if (this.cuentas.size > 10_000) this.limpiar(ahora);
    const c = this.cuentas.get(clave);
    if (!c || c.reinicia <= ahora) {
      this.cuentas.set(clave, { n: 1, reinicia: ahora + this.ventanaMs });
      return { permitido: true, reintentarEnS: 0 };
    }
    c.n += 1;
    return c.n > this.max
      ? { permitido: false, reintentarEnS: Math.ceil((c.reinicia - ahora) / 1000) }
      : { permitido: true, reintentarEnS: 0 };
  }

  private limpiar(ahora: number): void {
    for (const [k, v] of this.cuentas) if (v.reinicia <= ahora) this.cuentas.delete(k);
  }
}

/** Middleware que responde 429 cuando la clave supera el máximo de intentos en la ventana. */
export function limitar(opciones: { ventanaMs: number; max: number; clave: (req: Request) => string; mensaje: string }) {
  const contador = new ContadorVentana(opciones.ventanaMs, opciones.max);
  return (req: Request, res: Response, next: NextFunction): void => {
    const r = contador.intentar(opciones.clave(req));
    if (!r.permitido) {
      res.setHeader("Retry-After", String(r.reintentarEnS));
      return next(new AppError(`${opciones.mensaje} Reintentá en ${r.reintentarEnS} s.`, 429));
    }
    next();
  };
}
