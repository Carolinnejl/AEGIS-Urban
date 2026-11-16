import { ContadorVentana } from "../../src/shared/http/limitador";

describe("ContadorVentana", () => {
  it("permite hasta el máximo y bloquea el siguiente", () => {
    const c = new ContadorVentana(60_000, 3);
    expect([1, 2, 3].map(() => c.intentar("ip:ana", 1000).permitido)).toEqual([true, true, true]);
    const r = c.intentar("ip:ana", 1000);
    expect(r.permitido).toBe(false);
    expect(r.reintentarEnS).toBe(60);
  });

  it("las claves son independientes", () => {
    const c = new ContadorVentana(60_000, 1);
    c.intentar("a", 0); c.intentar("a", 0);
    expect(c.intentar("b", 0).permitido).toBe(true);
  });

  it("se reinicia al terminar la ventana", () => {
    const c = new ContadorVentana(1000, 1);
    c.intentar("a", 0); c.intentar("a", 500);
    expect(c.intentar("a", 1001).permitido).toBe(true);
  });
});
