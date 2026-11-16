import { validarSecretos } from "../../src/config/secretos";

const bueno = { JWT_SECRET: "a".repeat(64), AES_SECRET_KEY: "ab12".repeat(16) };

describe("validarSecretos", () => {
  it("acepta secretos fuertes", () => expect(validarSecretos(bueno)).toEqual([]));

  it("rechaza si falta JWT_SECRET (ya no hay valor por defecto)", () =>
    expect(validarSecretos({ ...bueno, JWT_SECRET: undefined })).toContain("JWT_SECRET no está definido"));

  it("rechaza un JWT_SECRET corto", () =>
    expect(validarSecretos({ ...bueno, JWT_SECRET: "corto" }).join()).toMatch(/al menos 32/));

  it.each(["dev_secret_change_in_prod_xxxxxxxxxxxxxxxxxxxx", "REEMPLAZAR_CON_STRING_ALEATORIO_DE_64_CHARS"])(
    "rechaza el valor de ejemplo %s", (v) =>
      expect(validarSecretos({ ...bueno, JWT_SECRET: v }).join()).toMatch(/valor de ejemplo/));

  it("exige AES_SECRET_KEY de 64 caracteres hexadecimales", () => {
    expect(validarSecretos({ ...bueno, AES_SECRET_KEY: undefined })).toContain("AES_SECRET_KEY no está definido");
    expect(validarSecretos({ ...bueno, AES_SECRET_KEY: "abc" }).join()).toMatch(/64 caracteres hexadecimales/);
    expect(validarSecretos({ ...bueno, AES_SECRET_KEY: "z".repeat(64) }).join()).toMatch(/64 caracteres hexadecimales/);
  });

  it("informa todos los problemas juntos", () => expect(validarSecretos({})).toHaveLength(2));
});

describe("valores por defecto de las pruebas", () => {
  it("el secreto de pruebas de env.ts pasa la validación (sin .env, como en CI)", () => {
    const fuente = require("fs").readFileSync(require("path").join(__dirname, "../../src/config/env.ts"), "utf8");
    const jwt = /JWT_SECRET\s+\?\?=\s+"([^"]+)"/.exec(fuente)?.[1];
    expect(jwt).toBeDefined();
    expect(validarSecretos({ JWT_SECRET: jwt, AES_SECRET_KEY: "0".repeat(64) })).toEqual([]);
  });
});
