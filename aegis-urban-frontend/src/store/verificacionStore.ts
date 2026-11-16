import { create } from "zustand";
import type { CanalVerificacion, CodigoEmitido } from "../services/verificacion";

/**
 * Códigos de verificación SIMULADOS que "llegaron" a la bandeja y al SMS de mentira.
 * Solo en memoria (sin persistir): si se recarga la página hay que pedir un código nuevo.
 */
interface EstadoVerificacionLocal {
  codigos: Partial<Record<CanalVerificacion, CodigoEmitido>>;
  /** Avisos por canal (ej: el correo no se pudo enviar). */
  avisos: Partial<Record<CanalVerificacion, string>>;
  guardar: (...emitidos: CodigoEmitido[]) => void;
  avisar: (canal: CanalVerificacion, texto: string | null) => void;
  limpiar: () => void;
}

export const useVerificacionStore = create<EstadoVerificacionLocal>()((set) => ({
  codigos: {},
  avisos: {},
  // Un código nuevo para un canal borra su aviso anterior.
  guardar: (...emitidos) =>
    set((s) => ({
      codigos: { ...s.codigos, ...Object.fromEntries(emitidos.map((e) => [e.canal, e])) },
      avisos: Object.fromEntries(Object.entries(s.avisos).filter(([c]) => !emitidos.some((e) => e.canal === c))),
    })),
  avisar: (canal, texto) => set((s) => ({ avisos: { ...s.avisos, [canal]: texto ?? undefined } })),
  limpiar: () => set({ codigos: {}, avisos: {} }),
}));
