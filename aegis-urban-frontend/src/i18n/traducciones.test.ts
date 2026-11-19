import { describe, it, expect } from "vitest";
import es from "../../public/locales/es/translation.json";
import en from "../../public/locales/en/translation.json";

/** Claves hoja ("a.b.c") de un árbol de traducciones. Los arreglos cuentan como una hoja. */
const hojas = (o: Record<string, unknown>, prefijo = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? hojas(v as Record<string, unknown>, `${prefijo}${k}.`) : [`${prefijo}${k}`]);

const valores = (o: Record<string, unknown>): unknown[] =>
  Object.values(o).flatMap((v) => (v && typeof v === "object" && !Array.isArray(v) ? valores(v as Record<string, unknown>) : [v]));

describe("traducciones es / en", () => {
  const clavesEs = hojas(es);
  const clavesEn = hojas(en);

  it("ambos idiomas tienen exactamente las mismas claves", () => {
    expect(clavesEn.filter((k) => !clavesEs.includes(k))).toEqual([]);
    expect(clavesEs.filter((k) => !clavesEn.includes(k))).toEqual([]);
  });

  it("no hay textos vacíos", () => {
    for (const v of [...valores(es), ...valores(en)]) {
      if (typeof v === "string") expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it("los marcadores {{variable}} coinciden entre idiomas", () => {
    const marcadores = (s: string) => (s.match(/{{\s*\w+\s*}}/g) ?? []).map((m) => m.replace(/\s/g, "")).sort();
    const plano = (o: Record<string, unknown>, p = ""): Record<string, string> =>
      Object.fromEntries(Object.entries(o).flatMap(([k, v]) =>
        typeof v === "string" ? [[`${p}${k}`, v]] : v && typeof v === "object" && !Array.isArray(v) ? Object.entries(plano(v as Record<string, unknown>, `${p}${k}.`)) : []));
    const pe = plano(es), pn = plano(en);
    for (const k of Object.keys(pe)) expect({ k, m: marcadores(pn[k] ?? "") }).toEqual({ k, m: marcadores(pe[k]) });
  });

  it("las listas (instrucciones, preguntas frecuentes) tienen la misma cantidad de elementos", () => {
    const listas = (o: Record<string, unknown>, p = ""): [string, number][] =>
      Object.entries(o).flatMap(([k, v]) => Array.isArray(v) ? [[`${p}${k}`, v.length] as [string, number]]
        : v && typeof v === "object" ? listas(v as Record<string, unknown>, `${p}${k}.`) : []);
    const ln = Object.fromEntries(listas(en));
    for (const [k, n] of listas(es)) expect({ k, n: ln[k] }).toEqual({ k, n });
  });
});
