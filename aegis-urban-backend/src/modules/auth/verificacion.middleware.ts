import { Request, Response, NextFunction } from "express";
import { db } from "../../config/database";
import { ForbiddenError } from "../../shared/errors/AppError";

/**
 * Para cuentas CIUDADANO exige el perfil verificado (ambos códigos confirmados).
 * El personal de gestión no pasa por la verificación. Los derechos de acceso y
 * supresión de datos NUNCA se condicionan a este middleware.
 */
export async function requierePerfilVerificado(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.familyName !== "CIUDADANO") return next();
    const { rows } = await db.consultar<{ verified_at: Date | null }>(`SELECT verified_at FROM users WHERE id_user = $1`, [req.user.id]);
    if (!rows[0]?.verified_at) throw new ForbiddenError("Verificá tu perfil con los códigos de email y celular para usar esta función");
    next();
  } catch (e) {
    next(e);
  }
}
