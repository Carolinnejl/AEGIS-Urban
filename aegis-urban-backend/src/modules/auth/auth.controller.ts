import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { requiereAutenticacion } from "./auth.middleware";
import { BadRequestError } from "../../shared/errors/AppError";
import { requierePermiso } from "../../security/access-control/PermissionGuard";
import { desconectarSesion } from "../websocket/SocketServer";
import { registroService, validarRegistro } from "./registro.service";
import { LEGAL } from "../../config/legal";
import { verificacionService } from "./verificacion.service";
import { requierePerfilVerificado } from "./verificacion.middleware";
import type { CanalVerificacion } from "./verificacion";
import { limitar } from "../../shared/http/limitador";

const router       = Router();
const servicioAuth = new AuthService();

// POST /api/auth/login
// Máximo 10 intentos por usuario e IP cada 15 minutos (frena la fuerza bruta de contraseñas).
const limitarLogin = limitar({
  ventanaMs: 15 * 60_000, max: 10,
  clave: (req) => `${req.ip}:${String(req.body?.username ?? "").toLowerCase()}`,
  mensaje: "Demasiados intentos de inicio de sesión.",
});

router.post("/login", limitarLogin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      throw new BadRequestError("username y password son requeridos");
    }

    const direccionIp  = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace("::ffff:", "");
    const agenteUsuario = req.headers["user-agent"] ?? "unknown";

    const resultado = await servicioAuth.iniciarSesion(username, password, direccionIp, agenteUsuario);

    res.status(200).json({
      message: "Sesión iniciada correctamente",
      token:   resultado.token,
      user: {
        id:         resultado.usuario.id,
        username:   resultado.usuario.username,
        familyId:   resultado.usuario.idFamilia,
        familyName: resultado.usuario.familia,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout  (requiere JWT válido)
router.post("/logout", requiereAutenticacion, requierePermiso("/api/auth/logout", "POST"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization!.slice(7);
    await servicioAuth.cerrarSesion(token);
    desconectarSesion(token);
    res.status(200).json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (retorna datos del usuario autenticado)
router.get("/me", requiereAutenticacion, requierePermiso("/api/auth/me", "GET"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario = await servicioAuth.obtenerUsuarioPorId(req.user!.id);
    res.status(200).json({ usuario });
  } catch (err) {
    next(err);
  }
});

const ipDe = (req: Request) => (req.ip ?? req.socket.remoteAddress ?? "unknown").replace("::ffff:", "");

// GET /api/auth/legal — versiones vigentes de los textos legales
router.get("/legal", (_req: Request, res: Response) => {
  res.json({ terminos: LEGAL.VERSION_TERMINOS, privacidad: LEGAL.VERSION_PRIVACIDAD, ubicacion: LEGAL.VERSION_UBICACION, edadMinima: LEGAL.EDAD_MINIMA });
});

// POST /api/auth/registro — alta de ciudadano. Exige aceptar términos, privacidad y declarar la edad.
router.post("/registro", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const datos = validarRegistro(req.body);
    const ip = ipDe(req);
    const idUsuario = await registroService.registrar(datos, ip);
    const verificacion = await verificacionService.emitirAmbos(idUsuario);
    const sesion = await servicioAuth.iniciarSesion(datos.username, datos.password, ip, req.headers["user-agent"] ?? "unknown");
    res.status(201).json({
      message: "Cuenta creada. Falta verificar el perfil con los códigos de email y celular",
      token: sesion.token,
      user: { id: sesion.usuario.id, username: sesion.usuario.username, familyId: sesion.usuario.idFamilia, familyName: sesion.usuario.familia },
      ubicacionConsentida: datos.aceptaUbicacion,
      verificacion,
    });
  } catch (err) { next(err); }
});

// ── Verificación de perfil por códigos (email y celular). El envío es SIMULADO en esta versión.
const canalDe = (valor: unknown): CanalVerificacion => {
  if (valor === "EMAIL" || valor === "PHONE") return valor;
  throw new BadRequestError("'canal' debe ser EMAIL o PHONE");
};
const limitarVerificacion = limitar({
  ventanaMs: 15 * 60_000, max: 30, clave: (req) => String(req.user?.id ?? req.ip),
  mensaje: "Demasiadas solicitudes de verificación.",
});

// GET /api/auth/verificacion — estado de la verificación del perfil
router.get("/verificacion", requiereAutenticacion, requierePermiso("/api/auth/verificacion", "GET"), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await verificacionService.estado(req.user!.id)); } catch (err) { next(err); }
});

// POST /api/auth/verificacion/reenviar — pide un código nuevo para un canal
router.post("/verificacion/reenviar", requiereAutenticacion, requierePermiso("/api/auth/verificacion/reenviar", "POST"), limitarVerificacion, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await verificacionService.emitir(req.user!.id, canalDe(req.body?.canal))); } catch (err) { next(err); }
});

// POST /api/auth/verificacion/confirmar — confirma el código recibido
router.post("/verificacion/confirmar", requiereAutenticacion, requierePermiso("/api/auth/verificacion/confirmar", "POST"), limitarVerificacion, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await verificacionService.confirmar(req.user!.id, canalDe(req.body?.canal), String(req.body?.codigo ?? ""), ipDe(req)));
  } catch (err) { next(err); }
});

// PUT /api/auth/consentimiento-ubicacion — otorgar o revocar el permiso de ubicación
router.put("/consentimiento-ubicacion", requiereAutenticacion, requierePermiso("/api/auth/consentimiento-ubicacion", "PUT"), requierePerfilVerificado, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (typeof req.body?.acepta !== "boolean") throw new BadRequestError("'acepta' debe ser true o false");
    await registroService.fijarConsentimientoUbicacion(req.user!.id, req.body.acepta, ipDe(req));
    res.json({ ubicacionConsentida: req.body.acepta });
  } catch (err) { next(err); }
});

// GET /api/auth/mis-datos — derecho de acceso (Ley 25.326, art. 14)
router.get("/mis-datos", requiereAutenticacion, requierePermiso("/api/auth/mis-datos", "GET"), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await registroService.misDatos(req.user!.id)); } catch (err) { next(err); }
});

// DELETE /api/auth/mis-datos — derecho de supresión (Ley 25.326, art. 16)
router.delete("/mis-datos", requiereAutenticacion, requierePermiso("/api/auth/mis-datos", "DELETE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await registroService.darDeBaja(req.user!.id, ipDe(req));
    res.json({ message: "Tu cuenta fue dada de baja y tus datos personales anonimizados" });
  } catch (err) { next(err); }
});

export default router;
