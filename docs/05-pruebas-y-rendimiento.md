# AEGIS Urban — Pruebas y rendimiento

## Estrategia

| Nivel | Qué prueba | Dónde | Comando | Cantidad |
|---|---|---|---|---|
| Unitarias backend | Lógica pura: integridad DVH, geometría, estrategias de evacuación, validación de registro, secretos, límite de intentos, respaldos | `aegis-urban-backend/tests/unit` | `npm test` | 133 en 13 suites |
| Unitarias frontend | Almacenes de sesión y verificación, caché de peticiones, **paridad de traducciones es/en** | `aegis-urban-frontend/src/**/*.test.ts` | `npm test` | 18 en 4 archivos |
| Integración | API + PostgreSQL reales: sesiones, patentes, bitácora e integridad, inmutabilidad, particiones, hashes | `tests/live/integracion.test.ts` | `npm run test:live` | 10 |
| Punta a punta (E2E) | Flujos reales en Chrome: ciudadanía, cambio de idioma, login inválido, ruta protegida, Administración con verificación de integridad, alerta → plan de evacuación | `aegis-urban-frontend/e2e/flujos.spec.ts` | `npm run test:e2e` | 6 |
| Seguridad | Autenticación, manipulación de JWT, inyección SQL, recorrido de directorios, cabeceras, CORS, fuerza bruta | `tests/live/seguridad.test.ts` | `npm run test:live` | 29 |
| Rendimiento | Latencia y throughput bajo carga concurrente, compresión | `scripts/rendimiento.mjs` | `npm run test:perf` | 5 endpoints |
| Automatización | Todo lo anterior en cada push y Pull Request | `.github/workflows/ci.yml` | GitHub Actions | 3 jobs |

Las pruebas E2E usan el Chrome instalado (Playwright con `channel: "chrome"`, sin descargar navegadores) y necesitan backend y frontend levantados. Las pruebas «en vivo» necesitan el servidor y PostgreSQL levantados (`arrancar.bat`). Cada ejecución consume intentos del limitador de login del usuario `admin` (10 cada 15 min); si se repiten muchas veces seguidas conviene reiniciar el backend. Las credenciales se pueden cambiar con `TEST_ADMIN_USER` y `TEST_ADMIN_PASS`.

### Qué cubre la suite de seguridad

- 11 rutas protegidas responden **401** sin token; token basura, firmado con otra clave, con algoritmo `none` y vencido son rechazados.
- El login no revela si el usuario existe (mismo mensaje) y responde 400 sin campos.
- Cuatro cargas de inyección SQL en login y parámetros de consulta no dan 500 ni inician sesión, y las tablas siguen intactas.
- Un nombre de respaldo con `../` no recorre directorios.
- Helmet activo (sin `X-Powered-By`), CORS no refleja orígenes ajenos, la API no devuelve hashes de contraseña ni trazas de pila.
- 12 intentos de login seguidos terminan en **429**, y el contador vive en PostgreSQL.
- Un inicio de sesión fallido queda en la bitácora como `USER_LOGIN_FAILED` (con el motivo, nunca la contraseña) y la integridad DVH/DVV sigue válida.

### Defecto encontrado y corregido gracias a estas pruebas

Dos inicios de sesión del mismo usuario dentro del mismo segundo generaban un JWT idéntico y la API respondía **500** por la restricción UNIQUE de `session_token.token_hash`. Ahora cada token lleva un `jti` aleatorio. Está cubierto por la prueba de integración «dos inicios de sesión simultáneos».

## Rendimiento

Medido en el equipo de desarrollo (API en `ts-node-dev` y PostgreSQL en Docker en la misma máquina), 20 conexiones concurrentes durante 6 s por endpoint:

| Endpoint | Peticiones | req/s | p50 | p95 | p99 | Errores |
|---|---|---|---|---|---|---|
| `GET /api/health` | 10 218 | 1 701 | 10,9 ms | 16,9 ms | 21,7 ms | 0 |
| `GET /api/sensores` | 2 174 | 361 | 52,9 ms | 82,6 ms | 101,7 ms | 0 |
| `GET /api/alertas` | 1 853 | 306 | 64,2 ms | 77,2 ms | 86,3 ms | 0 |
| `GET /api/telemetry/estadisticas` | 2 361 | 392 | 50,2 ms | 57,9 ms | 61,0 ms | 0 |
| `GET /api/publico/avisos` | — | — | — | — | — | limitado (ver abajo) |

- `/api/publico/*` tiene limitador de tasa a propósito (protege a la fuente externa de clima), por eso bajo carga responde **429**; el script lo cuenta aparte y no como error.
- La respuesta de `/api/sensores` se comprime con **gzip** (`Content-Encoding: gzip`).
- Son cifras de un entorno de desarrollo, no una garantía de producción: sirven como línea base para comparar cambios.

### Técnicas de rendimiento aplicadas

| Técnica | Dónde |
|---|---|
| Carga eficiente | Paginación en el servidor para alertas; consultas parametrizadas e índices por sensor/fecha |
| Compresión | `compression` (gzip) en la API; minificación y división en *chunks* del bundle con Vite |
| Caché | Servidor: clima 120 s, avisos 30 s, zonas 10 s con `Cache-Control`. Cliente: caché de peticiones con TTL y deduplicación (`services/cache.ts`) |
| Precarga | Las rutas se precargan al pasar el mouse o enfocar un enlace (`router/paginas.ts`) |
| Lazy loading | Cada página se carga bajo demanda con `React.lazy` y `Suspense` |
| Particionado | `sensor_reading` por trimestre |

## Registro de resultados

| Verificación | Resultado |
|---|---|
| Pruebas unitarias backend | 133 aprobadas |
| Pruebas unitarias frontend | 18 aprobadas |
| Integración + seguridad (en vivo) | 41 aprobadas |
| Punta a punta con navegador (Playwright) | 6 aprobadas |
| Compilación TypeScript backend y frontend | Ver sección de cierre del README |
| Job de CI «en vivo» en GitHub Actions | Definido, aún no ejecutado en GitHub (requiere subir los cambios) |
| Pruebas de aceptación con usuarios | Guion y acta listos en el documento unificado (5.3); falta realizarlas con personas |
