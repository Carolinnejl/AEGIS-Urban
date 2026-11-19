import { db } from "../../config/database";
import { env } from "../../config/env";
import { backupService } from "./backup.service";
import { debeCrearBackup } from "./backup.util";
import { limpiarVencidos } from "../../shared/store/almacen";

const CADA_HORAS = 6;

/** Crea las particiones de los próximos 6 trimestres si faltan (función SQL de la migración 015). */
export async function asegurarParticiones(): Promise<number> {
  const { rows } = await db.consultar<{ n: number }>("SELECT asegurar_particiones_sensor_reading(6) AS n");
  return rows[0].n;
}

/** Un ciclo de mantenimiento: particiones + respaldo diario con retención. Nunca lanza: solo registra en el log. */
export async function cicloMantenimiento(): Promise<void> {
  try {
    const creadas = await asegurarParticiones();
    if (creadas > 0) console.log(`[MANTENIMIENTO] ${creadas} partición(es) nueva(s) de sensor_reading`);
  } catch (e) {
    console.error("[MANTENIMIENTO] no se pudieron asegurar las particiones:", e instanceof Error ? e.message : e);
  }

  await limpiarVencidos();

  if (!env.backup.automatico) return;
  try {
    const ultimo = await backupService.ultimo();
    if (debeCrearBackup(ultimo ? new Date(ultimo.creado) : null, new Date())) {
      const b = await backupService.crear();
      const borrados = await backupService.aplicarRetencion();
      console.log(`[MANTENIMIENTO] respaldo ${b.archivo} (${Math.round(b.bytes / 1024)} KB)${borrados.length ? `, ${borrados.length} antiguo(s) eliminado(s)` : ""}`);
    }
  } catch (e) {
    console.warn("[MANTENIMIENTO] no se pudo crear el respaldo automático:", e instanceof Error ? e.message : e);
  }
}

export function iniciarMantenimiento(): void {
  void cicloMantenimiento();
  setInterval(() => void cicloMantenimiento(), CADA_HORAS * 3_600_000).unref();
}
