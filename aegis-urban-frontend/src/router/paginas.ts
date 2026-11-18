/**
 * Cargadores de cada pantalla (code splitting). Se comparten entre las rutas y la precarga:
 * al pasar el mouse por un enlace del menú se descarga el módulo antes del clic, y como el
 * navegador guarda los módulos importados, al navegar la pantalla aparece al instante.
 */
export const paginas = {
  "/dashboard":  () => import("../pages/Dashboard/DashboardPage"),
  "/mapa":       () => import("../pages/CityMap/CityMapPage"),
  "/sensores":   () => import("../pages/Sensors/SensorsPage"),
  "/alertas":    () => import("../pages/Alerts/AlertsPage"),
  "/simulacion": () => import("../pages/Simulation/SimulationPage"),
  "/admin":      () => import("../pages/Admin/AdminPage"),
} as const;

export type RutaPrecargable = keyof typeof paginas;

/** Descarga en segundo plano el módulo de una pantalla. Nunca lanza: si falla, se cargará al navegar. */
export function precargar(ruta: string): void {
  const cargar = (paginas as Record<string, () => Promise<unknown>>)[ruta];
  if (cargar) void cargar().catch(() => undefined);
}

/** Precarga cuando el navegador está libre (después de iniciar sesión, sin competir con lo que se ve). */
export function precargarEnReposo(rutas: string[]): void {
  const ejecutar = () => rutas.forEach(precargar);
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(ejecutar);
  } else {
    setTimeout(ejecutar, 1500);
  }
}
