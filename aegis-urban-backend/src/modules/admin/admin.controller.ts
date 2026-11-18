import { Router, Request, Response } from "express";
import { db } from "../../config/database";
import { requiereAutenticacion } from "../auth/auth.middleware";
import { bitacora } from "../../integrity/BitacoraService";
import { requierePermiso } from "../../security/access-control/PermissionGuard";
import { backupService } from "../backup/backup.service";
import { env } from "../../config/env";
import { BadRequestError } from "../../shared/errors/AppError";
import { esNombreValido } from "../backup/backup.util";

const router = Router();

// GET /api/admin/usuarios — lista usuarios con info de familia
router.get("/usuarios", requiereAutenticacion, requierePermiso("/api/admin/usuarios", "GET"), async (_req: Request, res: Response) => {
  const { rows } = await db.consultar(`
    SELECT u.id_user, u.username, u.email, u.is_active,
           u.created_at, u.last_login,
           f.name AS family_name
    FROM   users u
    LEFT JOIN family f ON f.id_family = u.id_family
    ORDER  BY u.id_user
  `);
  res.json({ usuarios: rows });
});

// GET /api/admin/familias — lista familias
router.get("/familias", requiereAutenticacion, requierePermiso("/api/admin/familias", "GET"), async (_req: Request, res: Response) => {
  const { rows } = await db.consultar(`
    SELECT f.id_family, f.name, f.description, f.is_active, f.created_at,
           COUNT(u.id_user)::int AS total_usuarios
    FROM   family f
    LEFT JOIN users u ON u.id_family = f.id_family
    GROUP  BY f.id_family, f.name, f.description, f.is_active, f.created_at
    ORDER  BY f.id_family
  `);
  res.json({ familias: rows });
});

// GET /api/admin/integridad — verifica DVH/DVV de la bitácora
router.get("/integridad", requiereAutenticacion, requierePermiso("/api/admin/integridad", "GET"), async (_req: Request, res: Response) => {
  const { rows: countRows } = await db.consultar<{ total: string }>(
    "SELECT COUNT(*) AS total FROM audit_log"
  );
  const totalFilas = parseInt(countRows[0].total, 10);

  const resultado = await bitacora.verificarIntegridad();
  res.json({
    integridad: {
      esValida:    resultado.esValida,
      filaCorrupta: resultado.filaCorrupta !== null ? resultado.filaCorrupta.toString() : null,
      motivo:      resultado.motivo,
      totalFilas,
    },
  });
});

// GET /api/admin/bitacora — últimas entradas del audit log
router.get("/bitacora", requiereAutenticacion, requierePermiso("/api/admin/bitacora", "GET"), async (req: Request, res: Response) => {
  const limite = Math.min(parseInt(String(req.query.limite ?? "20")), 100);
  const { rows } = await db.consultar(`
    SELECT id_log, action, entity_name, entity_id,
           id_user, ip_address, created_at
    FROM   audit_log
    ORDER  BY id_log DESC
    LIMIT  $1
  `, [limite]);
  res.json({ entradas: rows });
});

// ── Respaldos y restauración ─────────────────────────────────────────────────
const contexto = (req: Request) => ({ idUsuario: req.user?.id ?? null, ip: (req.ip ?? "desconocida").replace("::ffff:", "") });
const archivoDe = (req: Request): string => {
  const a = String(req.params.archivo);
  if (!esNombreValido(a)) throw new BadRequestError("Nombre de respaldo inválido");
  return a;
};

// GET /api/admin/backups — lista de respaldos y política vigente
router.get("/backups", requiereAutenticacion, requierePermiso("/api/admin/backups", "GET"), async (_req: Request, res: Response) => {
  res.json({
    backups: await backupService.listar(),
    politica: { automatico: env.backup.automatico, retencion: env.backup.retencion, modo: env.backup.modo },
  });
});

// POST /api/admin/backups — crea un respaldo ahora
router.post("/backups", requiereAutenticacion, requierePermiso("/api/admin/backups", "POST"), async (req: Request, res: Response) => {
  const backup = await backupService.crear(contexto(req));
  const eliminados = await backupService.aplicarRetencion();
  res.status(201).json({ backup, eliminados });
});

// POST /api/admin/backups/:archivo/simulacro — restaura en una base temporal y verifica la integridad
router.post("/backups/:archivo/simulacro", requiereAutenticacion, requierePermiso("/api/admin/backups/:archivo/simulacro", "POST"), async (req: Request, res: Response) => {
  res.json({ simulacro: await backupService.simulacro(archivoDe(req), contexto(req)) });
});

// POST /api/admin/backups/:archivo/restaurar — restaura sobre la base en uso (exige confirmar: "RESTAURAR")
router.post("/backups/:archivo/restaurar", requiereAutenticacion, requierePermiso("/api/admin/backups/:archivo/restaurar", "POST"), async (req: Request, res: Response) => {
  res.json({ restauracion: await backupService.restaurar(archivoDe(req), String(req.body?.confirmar ?? ""), contexto(req)) });
});

export default router;
