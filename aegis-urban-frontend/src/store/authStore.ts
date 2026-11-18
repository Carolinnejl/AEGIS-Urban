import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UsuarioAuth {
  id:        number;
  username:  string;
  idFamilia: number;
  familia:   string;
  /** Códigos de patente efectivos (propios + heredados). La API sigue validando cada petición. */
  permisos?: string[];
}

interface EstadoAuth {
  usuario:            UsuarioAuth | null;
  token:              string | null;
  autenticado:        boolean;
  establecerSesion:   (usuario: UsuarioAuth, token: string) => void;
  cerrarSesion:       () => void;
}

/** ¿El usuario tiene esa patente? Los botones se muestran por patente, no por nombre de familia. */
export const usePatente = (codigo: string): boolean =>
  useAuthStore((s) => s.usuario?.permisos?.includes(codigo) ?? false);

export const useAuthStore = create<EstadoAuth>()(
  persist(
    (set) => ({
      usuario:     null,
      token:       null,
      autenticado: false,

      establecerSesion: (usuario, token) =>
        set({ usuario, token, autenticado: true }),

      cerrarSesion: () =>
        set({ usuario: null, token: null, autenticado: false }),
    }),
    {
      name: "aegis-auth",
      // v2: la sesión guarda las patentes. Una sesión anterior sin ellas se descarta y se vuelve a iniciar sesión.
      version: 2,
      migrate: () => ({ usuario: null, token: null, autenticado: false }),
      partialize: (estado) => ({
        usuario:     estado.usuario,
        token:       estado.token,
        autenticado: estado.autenticado,
      }),
    }
  )
);
