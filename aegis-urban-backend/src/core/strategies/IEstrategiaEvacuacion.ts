/** Punto de encuentro sugerido (hoy: el centro de un distrito cercano; no hay catastro de refugios). */
export interface PuntoEncuentro {
  nombre: string;
  lat:    number;
  lon:    number;
}

export interface DatosAlerta {
  idAlerta:  number;
  idSensor:  number;
  nivel:     string;
  tipo:      string;
  /** Ubicación real del sensor que originó la alerta (tabla `sensor`). */
  lat:       number;
  lon:       number;
  /** Nombre de la zona donde está el sensor. */
  zona?:     string;
  puntosEncuentro?: PuntoEncuentro[];
  idNodoCiudad?: number;
}

export interface PlanEvacuacion {
  estrategiaUsada:   string;
  rutaGeojson:       string;       // GeoJSON serializado
  personasEstimadas: number;
  instrucciones:     string;
  /** Radio del área de evacuación en metros, centrada en el sensor. */
  radioMetros:       number;
}

/**
 * Densidad poblacional de REFERENCIA (hab/km²) para estimar personas afectadas.
 * Es un supuesto, no un dato censal: para un uso real hay que reemplazarlo por
 * datos del INDEC por radio censal.
 */
export const DENSIDAD_REFERENCIA_HAB_KM2 = 5_000;

// ── Interfaz Strategy ─────────────────────────────────────────────────────────
export interface IEstrategiaEvacuacion {
  obtenerNombre(): string;
  calcularPlan(alerta: DatosAlerta): PlanEvacuacion;
}
