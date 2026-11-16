/**
 * Geometría para los planes de evacuación: funciones puras, sin I/O.
 * Las coordenadas GeoJSON van en el orden [longitud, latitud].
 */

const RADIO_TIERRA_M = 6_371_000;
const aRad = (g: number) => (g * Math.PI) / 180;
const aGrados = (r: number) => (r * 180) / Math.PI;

/** Punto a `distanciaM` metros de (lat, lon) siguiendo el rumbo (0° = norte). */
export function puntoDestino(lat: number, lon: number, rumboGrados: number, distanciaM: number): { lat: number; lon: number } {
  const d = distanciaM / RADIO_TIERRA_M;
  const rumbo = aRad(rumboGrados);
  const lat1 = aRad(lat);
  const lon1 = aRad(lon);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(rumbo));
  const lon2 = lon1 + Math.atan2(Math.sin(rumbo) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: aGrados(lat2), lon: ((aGrados(lon2) + 540) % 360) - 180 };
}

/** Anillo cerrado GeoJSON ([lon, lat]) que aproxima un círculo con `segmentos` lados. */
export function anilloCircular(lat: number, lon: number, radioM: number, segmentos = 32): [number, number][] {
  const anillo: [number, number][] = [];
  for (let i = 0; i < segmentos; i++) {
    const p = puntoDestino(lat, lon, (360 * i) / segmentos, radioM);
    anillo.push([Number(p.lon.toFixed(6)), Number(p.lat.toFixed(6))]);
  }
  anillo.push(anillo[0]);
  return anillo;
}

/** Área en km² de un círculo de radio `radioM`. */
export const areaCirculoKm2 = (radioM: number): number => (Math.PI * radioM * radioM) / 1_000_000;
