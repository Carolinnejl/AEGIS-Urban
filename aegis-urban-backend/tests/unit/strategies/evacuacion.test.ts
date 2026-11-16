import { EstrategiaZonal } from "../../../src/core/strategies/EstrategiaZonal";
import { EstraategiaMasiva } from "../../../src/core/strategies/EstraategiaMasiva";
import { EstrategiaRefugio } from "../../../src/core/strategies/EstrategiaRefugio";
import { DatosAlerta } from "../../../src/core/strategies/IEstrategiaEvacuacion";

const belgrano: DatosAlerta = { idAlerta: 1, idSensor: 7, nivel: "CRITICAL", tipo: "FLOOD", lat: -34.559, lon: -58.4535, zona: "Belgrano" };
const laBoca: DatosAlerta = { ...belgrano, idAlerta: 2, idSensor: 9, lat: -34.6345, lon: -58.3636, zona: "La Boca" };

const centro = (geojson: string) => {
  const anillo: [number, number][] = JSON.parse(geojson).geometry.coordinates[0];
  const pts = anillo.slice(0, -1);
  return {
    lon: pts.reduce((s, p) => s + p[0], 0) / pts.length,
    lat: pts.reduce((s, p) => s + p[1], 0) / pts.length,
  };
};

describe.each([
  ["Zonal", new EstrategiaZonal()],
  ["Masiva", new EstraategiaMasiva()],
])("Estrategia %s", (_n, estrategia) => {
  it("centra el plan en la ubicación real del sensor", () => {
    const c = centro(estrategia.calcularPlan(belgrano).rutaGeojson);
    expect(c.lat).toBeCloseTo(belgrano.lat, 3);
    expect(c.lon).toBeCloseTo(belgrano.lon, 3);
  });

  it("sensores en lugares distintos producen planes distintos (ya no son coordenadas fijas)", () => {
    const a = estrategia.calcularPlan(belgrano).rutaGeojson;
    const b = estrategia.calcularPlan(laBoca).rutaGeojson;
    expect(a).not.toEqual(b);
    expect(centro(b).lat).toBeCloseTo(laBoca.lat, 3);
  });

  it("nombra la zona y el sensor en las instrucciones", () => {
    const { instrucciones } = estrategia.calcularPlan(belgrano);
    expect(instrucciones).toContain("Belgrano");
    expect(instrucciones).toContain("#7");
  });
});

describe("tamaño del plan", () => {
  it("la evacuación masiva abarca más personas que la zonal", () => {
    expect(new EstraategiaMasiva().calcularPlan(belgrano).personasEstimadas)
      .toBeGreaterThan(new EstrategiaZonal().calcularPlan(belgrano).personasEstimadas);
  });
  it("un incendio amplía el radio respecto de una inundación", () => {
    const fuego = new EstrategiaZonal().calcularPlan({ ...belgrano, tipo: "FIRE" }).personasEstimadas;
    expect(fuego).toBeGreaterThan(new EstrategiaZonal().calcularPlan(belgrano).personasEstimadas);
  });
});

describe("Estrategia Refugio", () => {
  const puntos = [{ nombre: "Palermo", lat: -34.5795, lon: -58.4257 }, { nombre: "Recoleta", lat: -34.5874, lon: -58.396 }];
  const plan = new EstrategiaRefugio().calcularPlan({ ...belgrano, tipo: "WIND", puntosEncuentro: puntos });
  const geo = JSON.parse(plan.rutaGeojson);

  it("nadie se mueve", () => expect(plan.personasEstimadas).toBe(0));
  it("incluye el área afectada y los puntos de encuentro recibidos", () => {
    expect(geo.features).toHaveLength(3);
    expect(geo.features[1].properties).toMatchObject({ tipo: "refugio_principal", nombre: "Palermo" });
    expect(geo.features[1].geometry.coordinates).toEqual([-58.4257, -34.5795]);
  });
  it("funciona sin puntos de encuentro", () => {
    const sin = new EstrategiaRefugio().calcularPlan({ ...belgrano, tipo: "WIND" });
    expect(JSON.parse(sin.rutaGeojson).features).toHaveLength(1);
  });
});
