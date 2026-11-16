import { anilloCircular, areaCirculoKm2, puntoDestino } from "../../../src/core/geo/geometria";
import { distanciaMetros } from "../../../src/core/geo/riesgo";

describe("puntoDestino", () => {
  it("1 km al norte aumenta la latitud ~0,009° y no cambia la longitud", () => {
    const p = puntoDestino(-34.6, -58.4, 0, 1000);
    expect(p.lat - -34.6).toBeCloseTo(0.009, 3);
    expect(p.lon).toBeCloseTo(-58.4, 5);
  });
  it("queda a la distancia pedida (ida y vuelta con haversine)", () => {
    const p = puntoDestino(-34.6, -58.4, 135, 2500);
    expect(distanciaMetros(-34.6, -58.4, p.lat, p.lon)).toBeCloseTo(2500, 0);
  });
});

describe("anilloCircular", () => {
  const anillo = anilloCircular(-34.559, -58.4535, 500, 32);
  it("es un anillo cerrado de segmentos + 1 puntos", () => {
    expect(anillo).toHaveLength(33);
    expect(anillo[0]).toEqual(anillo[32]);
  });
  it("todos los vértices están a ~500 m del centro", () => {
    for (const [lon, lat] of anillo) {
      expect(distanciaMetros(-34.559, -58.4535, lat, lon)).toBeGreaterThan(498);
      expect(distanciaMetros(-34.559, -58.4535, lat, lon)).toBeLessThan(502);
    }
  });
  it("usa orden GeoJSON [lon, lat]", () => {
    expect(anillo[0][0]).toBeLessThan(-58); // longitud primero
    expect(anillo[0][1]).toBeGreaterThan(-35);
  });
});

describe("areaCirculoKm2", () => {
  it("radio 1000 m ≈ 3,14 km²", () => expect(areaCirculoKm2(1000)).toBeCloseTo(Math.PI, 5));
});
