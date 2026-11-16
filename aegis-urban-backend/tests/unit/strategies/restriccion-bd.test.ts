import fs from "fs";
import path from "path";
import { EstrategiaZonal } from "../../../src/core/strategies/EstrategiaZonal";
import { EstraategiaMasiva } from "../../../src/core/strategies/EstraategiaMasiva";
import { EstrategiaRefugio } from "../../../src/core/strategies/EstrategiaRefugio";

/**
 * Regresión: las estrategias llegaron a usar nombres que la restricción CHECK de
 * evacuation_plan.strategy_used no aceptaba, y ningún plan se podía guardar.
 * La migración 014 define la lista permitida: cada estrategia debe figurar ahí.
 */
describe("nombres de estrategia vs restricción de la base", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../../../database/migrations/014_evacuation_strategies.sql"), "utf8");

  it.each([new EstrategiaZonal(), new EstraategiaMasiva(), new EstrategiaRefugio()])(
    "%s está permitida por la restricción", (estrategia) => {
      expect(sql).toContain(`'${estrategia.obtenerNombre()}'`);
      expect(estrategia.obtenerNombre().length).toBeLessThanOrEqual(20); // VARCHAR(20)
    });
});
