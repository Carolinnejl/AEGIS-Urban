import { defineConfig, mergeConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

// Las pruebas de punta a punta (e2e/) las ejecuta Playwright, no Vitest.
export default mergeConfig(
  viteConfig,
  defineConfig({ test: { exclude: [...configDefaults.exclude, "e2e/**"] } }),
);
