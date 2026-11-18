import { IEstrategiaEvacuacion, DatosAlerta, PlanEvacuacion, DENSIDAD_REFERENCIA_HAB_KM2 } from "./IEstrategiaEvacuacion";
import { anilloCircular, areaCirculoKm2 } from "../geo/geometria";

/** Radio de evacuación en metros: 2 km alrededor del sensor (3 km si es un incendio). */
export const radioMasivaM = (tipo: string): number => (tipo === "FIRE" ? 3000 : 2000);

// Evacúa un área amplia — para alertas CRITICAL/CATASTROPHIC. Centrada en la ubicación real del sensor.
export class EstraategiaMasiva implements IEstrategiaEvacuacion {
  obtenerNombre(): string { return "MASIVA"; }

  calcularPlan(alerta: DatosAlerta): PlanEvacuacion {
    const radio = radioMasivaM(alerta.tipo);
    const donde = alerta.zona ? ` (${alerta.zona})` : "";
    return {
      estrategiaUsada: this.obtenerNombre(),
      rutaGeojson: JSON.stringify({
        type: "Feature",
        properties: { radio_metros: radio, tipo: "evacuacion_masiva", nivel: "DISTRITO", sensor: alerta.idSensor },
        geometry: { type: "Polygon", coordinates: [anilloCircular(alerta.lat, alerta.lon, radio, 48)] },
      }),
      personasEstimadas: Math.round(areaCirculoKm2(radio) * DENSIDAD_REFERENCIA_HAB_KM2),
      radioMetros: radio,
      instrucciones:
        `EVACUACIÓN MASIVA — Alerta CRÍTICA (${alerta.tipo})${donde}. ` +
        `Evacuar un radio de ${radio / 1000} km alrededor del sensor #${alerta.idSensor} de inmediato. ` +
        "Usar rutas de evacuación principales. " +
        "Llevar documentos, medicamentos y agua. NO usar ascensores. " +
        "Seguir instrucciones de Defensa Civil y Bomberos.",
    };
  }
}
