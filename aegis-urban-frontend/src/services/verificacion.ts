import api from "./api";

export type CanalVerificacion = "EMAIL" | "PHONE";

export interface CodigoEmitido {
  canal: CanalVerificacion;
  destinoEnmascarado: string;
  venceEn: string;
  simulado: boolean;
  /** Solo en modo simulado: se muestra en una bandeja/SMS de mentira. */
  codigoSimulado?: string;
}

export interface EstadoVerificacion {
  emailVerificado: boolean;
  telefonoVerificado: boolean;
  verificado: boolean;
  emailEnmascarado: string;
  telefonoEnmascarado: string | null;
  /** Qué canales se simulan hoy: el correo puede ser real; el celular siempre es simulado. */
  emailSimulado: boolean;
  telefonoSimulado: boolean;
}

export const verificacionApi = {
  estado: () => api.get<EstadoVerificacion>("/auth/verificacion").then((r) => r.data),
  reenviar: (canal: CanalVerificacion) =>
    api.post<CodigoEmitido>("/auth/verificacion/reenviar", { canal }).then((r) => r.data),
  confirmar: (canal: CanalVerificacion, codigo: string) =>
    api.post<EstadoVerificacion>("/auth/verificacion/confirmar", { canal, codigo }).then((r) => r.data),
};

/** Deja solo dígitos y corta a 6: lo que el campo del código acepta. */
export const soloCodigo = (valor: string): string => valor.replace(/\D/g, "").slice(0, 6);
