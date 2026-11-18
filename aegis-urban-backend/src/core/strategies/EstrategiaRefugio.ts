import { IEstrategiaEvacuacion, DatosAlerta, PlanEvacuacion } from "./IEstrategiaEvacuacion";
import { anilloCircular } from "../geo/geometria";

const RADIO_AFECTACION_M = 1000;

// Refugio en el lugar — cuando evacuar es más peligroso que quedarse (ej: tormenta, viento, corte de energía).
// Marca el área afectada alrededor del sensor y los puntos de encuentro más cercanos.
export class EstrategiaRefugio implements IEstrategiaEvacuacion {
  obtenerNombre(): string { return "REFUGIO_IN_SITU"; }

  calcularPlan(alerta: DatosAlerta): PlanEvacuacion {
    const puntos = alerta.puntosEncuentro ?? [];
    const donde = alerta.zona ? ` en ${alerta.zona}` : "";
    return {
      estrategiaUsada: this.obtenerNombre(),
      rutaGeojson: JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { tipo: "area_afectada", radio_metros: RADIO_AFECTACION_M, sensor: alerta.idSensor },
            geometry: { type: "Polygon", coordinates: [anilloCircular(alerta.lat, alerta.lon, RADIO_AFECTACION_M)] },
          },
          ...puntos.map((p, i) => ({
            type: "Feature",
            properties: { tipo: i === 0 ? "refugio_principal" : "refugio_secundario", nombre: p.nombre },
            geometry: { type: "Point", coordinates: [p.lon, p.lat] },
          })),
        ],
      }),
      personasEstimadas: 0, // no se mueve gente
      radioMetros: RADIO_AFECTACION_M,
      instrucciones:
        `REFUGIO EN EL LUGAR — ${alerta.tipo}${donde}. ` +
        "Permanecer en interiores. Cerrar puertas y ventanas. " +
        "Alejarse de ventanas. Sintonizar radio de emergencia. " +
        "NO salir hasta nueva instrucción de Defensa Civil." +
        (puntos.length ? ` Puntos de encuentro de referencia: ${puntos.map((p) => p.nombre).join(", ")}.` : ""),
    };
  }
}
