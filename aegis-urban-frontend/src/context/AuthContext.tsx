import React, { createContext, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api, { RespuestaLogin } from "../services/api";
import { useUbicacionStore } from "../store/ubicacionStore";
import { useVerificacionStore } from "../store/verificacionStore";
import { verificacionApi, type CodigoEmitido } from "../services/verificacion";

export interface DatosRegistro {
  username: string; email: string; telefono: string; password: string;
  aceptaTerminos: boolean; aceptaPrivacidad: boolean; declaraEdad: boolean; aceptaUbicacion: boolean;
  versionTerminos: string; versionPrivacidad: string;
}

interface ValorContextoAuth {
  iniciarSesion: (username: string, contrasena: string) => Promise<void>;
  registrar:     (datos: DatosRegistro) => Promise<void>;
  cerrarSesion:  () => Promise<void>;
}

const ContextoAuth = createContext<ValorContextoAuth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { establecerSesion, cerrarSesion: limpiarSesion, token } = useAuthStore();
  const navegar = useNavigate();

  const iniciarSesion = useCallback(async (username: string, contrasena: string) => {
    const { data } = await api.post<RespuestaLogin>("/auth/login", { username, password: contrasena });
    establecerSesion(
      {
        id:        data.user.id,
        username:  data.user.username,
        idFamilia: data.user.familyId,
        familia:   data.user.familyName,
      },
      data.token
    );
    if (data.user.familyName !== "CIUDADANO") { navegar("/dashboard", { replace: true }); return; }
    // Un ciudadano con el perfil sin verificar completa primero los códigos de email y celular.
    let verificado = true;
    try { verificado = (await verificacionApi.estado()).verificado; } catch { /* si falla, no bloquea el ingreso */ }
    navegar(verificado ? "/ciudadano" : "/verificar", { replace: true });
  }, [establecerSesion, navegar]);

  const registrar = useCallback(async (datos: DatosRegistro) => {
    const { data } = await api.post<RespuestaLogin & { ubicacionConsentida: boolean; verificacion: { email: CodigoEmitido | null; telefono: CodigoEmitido; avisoEmail?: string } }>("/auth/registro", datos);
    establecerSesion(
      { id: data.user.id, username: data.user.username, idFamilia: data.user.familyId, familia: data.user.familyName },
      data.token
    );
    // El permiso de ubicación quedó registrado en el servidor; lo reflejamos en este dispositivo.
    useUbicacionStore.getState().fijarConsentimiento(data.ubicacionConsentida);
    // "Llegan" los códigos simulados al correo y al celular de mentira; hay que confirmarlos para verificar el perfil.
    const { guardar, avisar } = useVerificacionStore.getState();
    guardar(...[data.verificacion.email, data.verificacion.telefono].filter((c): c is CodigoEmitido => c !== null));
    if (data.verificacion.avisoEmail) avisar("EMAIL", data.verificacion.avisoEmail);
    navegar("/verificar", { replace: true });
  }, [establecerSesion, navegar]);

  const cerrarSesion = useCallback(async () => {
    try {
      if (token) await api.post("/auth/logout");
    } catch {
      // Ignora errores de red en cierre de sesión
    } finally {
      limpiarSesion();
      useVerificacionStore.getState().limpiar();
      navegar("/login", { replace: true });
    }
  }, [token, limpiarSesion, navegar]);

  return (
    <ContextoAuth.Provider value={{ iniciarSesion, registrar, cerrarSesion }}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth(): ValorContextoAuth {
  const ctx = useContext(ContextoAuth);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
