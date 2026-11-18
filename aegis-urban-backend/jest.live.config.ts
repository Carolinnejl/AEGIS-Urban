import type { Config } from "jest";

// Pruebas "en vivo" (seguridad, integración, rendimiento): requieren el servidor y PostgreSQL levantados.
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/live"],
  testMatch: ["**/*.test.ts"],
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  testTimeout: 30_000,
  verbose: true,
};
export default config;
