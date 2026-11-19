import { describe, it, expect, beforeEach, vi } from "vitest";
import { conCache, invalidar, estadisticas } from "./cache";

describe("conCache", () => {
  beforeEach(() => { invalidar(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-18T10:00:00Z")); });

  it("la segunda lectura sale de la memoria y no vuelve a pedir", async () => {
    const pedir = vi.fn().mockResolvedValue("dato");
    expect(await conCache("a", 1000, pedir)).toBe("dato");
    expect(await conCache("a", 1000, pedir)).toBe("dato");
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it("al vencer el TTL vuelve a pedir", async () => {
    const pedir = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    expect(await conCache("b", 1000, pedir)).toBe("v1");
    vi.setSystemTime(new Date("2026-11-18T10:00:02Z"));
    expect(await conCache("b", 1000, pedir)).toBe("v2");
    expect(pedir).toHaveBeenCalledTimes(2);
  });

  it("dos pedidos simultáneos hacen una sola petición", async () => {
    let resolver!: (v: string) => void;
    const pedir = vi.fn(() => new Promise<string>((r) => { resolver = r; }));
    const antes = estadisticas.deduplicados;
    const p1 = conCache("c", 1000, pedir);
    const p2 = conCache("c", 1000, pedir);
    resolver("x");
    expect(await Promise.all([p1, p2])).toEqual(["x", "x"]);
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(estadisticas.deduplicados).toBe(antes + 1);
  });

  it("un error no se guarda: el siguiente pedido reintenta", async () => {
    const pedir = vi.fn().mockRejectedValueOnce(new Error("caído")).mockResolvedValueOnce("ok");
    await expect(conCache("d", 1000, pedir)).rejects.toThrow("caído");
    expect(await conCache("d", 1000, pedir)).toBe("ok");
  });

  it("invalidar por prefijo descarta solo lo que corresponde", async () => {
    await conCache("zonas:1", 60_000, async () => 1);
    await conCache("clima:1", 60_000, async () => 2);
    invalidar("zonas");
    const pedirZonas = vi.fn().mockResolvedValue(10);
    const pedirClima = vi.fn().mockResolvedValue(20);
    expect(await conCache("zonas:1", 60_000, pedirZonas)).toBe(10);
    expect(await conCache("clima:1", 60_000, pedirClima)).toBe(2);
    expect(pedirClima).not.toHaveBeenCalled();
  });
});
