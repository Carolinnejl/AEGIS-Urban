import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { paginas } from "./paginas";

// ── Lazy loading — cada página carga su chunk JS solo cuando se navega a ella.
// CityMap carga Leaflet (~500kb) únicamente cuando el usuario abre el mapa.
const PaginaLogin      = lazy(() => import("../pages/Login/LoginPage"));
const PaginaDashboard  = lazy(paginas["/dashboard"]);
const PaginaMapa       = lazy(paginas["/mapa"]);
const PaginaSensores   = lazy(paginas["/sensores"]);
const PaginaAlertas    = lazy(paginas["/alertas"]);
const PaginaSimulacion = lazy(paginas["/simulacion"]);
const PaginaRegistro    = lazy(() => import("../pages/Register/RegisterPage"));
const PaginaVerificar    = lazy(() => import("../pages/Verify/VerifyPage"));
const PaginaAyuda      = lazy(() => import("../pages/Help/HelpPage"));
const PaginaCiudadano   = lazy(() => import("../pages/Citizen/CitizenPage"));
const PaginaTerminos    = lazy(() => import("../pages/Legal/LegalPage").then(m => ({ default: m.PaginaTerminos })));
const PaginaPrivacidad  = lazy(() => import("../pages/Legal/LegalPage").then(m => ({ default: m.PaginaPrivacidad })));
const PaginaAdmin      = lazy(paginas["/admin"]);

function CargadorPagina() {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <span>Cargando módulo...</span>
    </div>
  );
}

function RutaPrivada({ children }: { children: React.ReactNode }) {
  const autenticado = useAuthStore((s) => s.autenticado);
  const familia = useAuthStore((s) => s.usuario?.familia);
  if (!autenticado) return <Navigate to="/login" replace />;
  // Los ciudadanos solo ven su vista pública; nunca las pantallas de gestión.
  if (familia === "CIUDADANO") return <Navigate to="/ciudadano" replace />;
  return <>{children}</>;
}

// Solo para cuentas ciudadanas con sesión iniciada (la verificación de perfil).
function RutaCiudadano({ children }: { children: React.ReactNode }) {
  const autenticado = useAuthStore((s) => s.autenticado);
  const familia = useAuthStore((s) => s.usuario?.familia);
  if (!autenticado) return <Navigate to="/login" replace />;
  if (familia !== "CIUDADANO") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<CargadorPagina />}>
      <Routes>
        {/* ── Pública */}
        <Route path="/login" element={<PaginaLogin />} />
        <Route path="/registro" element={<PaginaRegistro />} />
        <Route path="/ciudadano" element={<PaginaCiudadano />} />
        <Route path="/ayuda" element={<PaginaAyuda />} />
        <Route path="/verificar" element={<RutaCiudadano><PaginaVerificar /></RutaCiudadano>} />
        <Route path="/terminos" element={<PaginaTerminos />} />
        <Route path="/privacidad" element={<PaginaPrivacidad />} />

        {/* ── Privadas */}
        <Route path="/dashboard" element={
          <RutaPrivada><PaginaDashboard /></RutaPrivada>
        } />
        <Route path="/mapa" element={
          <RutaPrivada><PaginaMapa /></RutaPrivada>
        } />
        <Route path="/sensores" element={
          <RutaPrivada><PaginaSensores /></RutaPrivada>
        } />
        <Route path="/alertas" element={
          <RutaPrivada><PaginaAlertas /></RutaPrivada>
        } />
        <Route path="/simulacion" element={
          <RutaPrivada><PaginaSimulacion /></RutaPrivada>
        } />
        <Route path="/admin" element={
          <RutaPrivada><PaginaAdmin /></RutaPrivada>
        } />

        {/* ── Redireccionamiento raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
