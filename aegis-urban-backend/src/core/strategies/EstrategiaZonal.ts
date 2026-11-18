import { IEstrategiaEvacuacion, DatosAlerta, PlanEvacuacion, DENSIDAD_REFERENCIA_HAB_KM2 } from "./IEstrategiaEvacuacion";
import { anilloCircular, areaCirculoKm2 } from "../geo/geometria";

/** Radio de evacuación en metros: 500 m alrededor del sensor (750 m si es un incendio). */
export const radioZonalM = (tipo: string): number => (tipo === "FIRE" ? 750 : 500);

// Evacúa solo la zona afectada, centrada en la ubicación real del sensor.
export class EstrategiaZonal implements IEstrategiaEvacuacion {
  obtenerNombre(): string { return "ZONAL"; }

  calcularPlan(alerta: DatosAlerta): PlanEvacuacion {
    const radio = radioZonalM(alerta.tipo);
    const donde = alerta.zona ? ` en ${alerta.zona}` : "";
    return {
      estrategiaUsada: this.obtenerNombre(),
      rutaGeojson: JSON.stringify({
        type: "Feature",
        properties: { radio_metros: radio, tipo: "evacuacion_zonal", sensor: alerta.idSensor },
        geometry: { type: "Polygon", coordinates: [anilloCircular(alerta.lat, alerta.lon, radio)] },
      }),
      personasEstimadas: Math.round(areaCirculoKm2(radio) * DENSIDAD_REFERENCIA_HAB_KM2),
      radioMetros: radio,
      instrucciones:
        `EVACUACIÓN ZONAL — Sensor #${alerta.idSensor} (${alerta.tipo})${donde}. ` +
        `Desalojar un radio de ${radio} m alrededor de ${alerta.lat.toFixed(4)}, ${alerta.lon.toFixed(4)}. ` +
        "Dirigirse al punto de encuentro más cercano. " +
        "Respetar señalización y personal de Defensa Civil.",
    };
  }
}
