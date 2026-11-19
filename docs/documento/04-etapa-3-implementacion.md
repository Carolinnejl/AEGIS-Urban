<!-- Archivo generado por docs/unificado/generar-markdown.cjs. No editar: cambiar el maestro o las fuentes y regenerar. -->
[← Etapa 2 — Diseño y arquitectura](03-etapa-2-diseno.md) · [Índice](00-portada.md#índice-general) · [Etapa 4 — Release y cierre →](05-etapa-4-release.md)

# 4. Etapa 3 — Implementación, construcción y testing

## 4.1 Preparación del entorno

Requisitos: Node.js 20+, Docker Desktop y Git. En Windows, `arrancar.bat` reutiliza o crea el contenedor `aegis_postgres`, aplica las migraciones 006–018 y los datos iniciales, genera el `.env` con secretos aleatorios si falta, instala dependencias y abre el backend (puerto 3001) y el frontend (puerto 5173). `detener.bat` los detiene. `docker-compose.yml` monta las migraciones solo al crear un volumen vacío.

| Dónde | Comando | Qué hace |
|---|---|---|
| backend | `npm run dev` | API con recarga automática |
| backend | `npm test` | 133 pruebas unitarias |
| backend | `npm run test:live` | 99 pruebas de integración y seguridad contra la API y PostgreSQL |
| backend | `npm run test:perf` | Prueba de carga con percentiles |
| backend | `npm run build` | Compila a JavaScript |
| frontend | `npm run dev` / `npm test` / `npm run build` | Web en Vite, 18 pruebas y bundle de producción |
| frontend | `npm run test:e2e` | 6 pruebas de punta a punta con Chrome real (requiere backend y frontend levantados) |

## 4.2 Construcción por módulos y estándares de codificación


```text
AEGIS-Urban-master/
├── aegis-urban-backend/
│   ├── database/migrations/    # Cambios SQL numerados
│   ├── database/seeds/         # Datos iniciales y de ejemplo
│   ├── scripts/                # crear-env.js: genera el .env con secretos aleatorios
│   ├── src/modules/            # Autenticación y registro, alertas, sensores, admin, simulación, public
│   ├── src/core/geo/           # Cálculo de cercanía a zonas de riesgo
│   ├── src/config/legal.ts     # Versiones vigentes de los textos legales
│   ├── src/security/           # Autorización por familia
│   └── tests/                  # Pruebas automatizadas
├── aegis-urban-frontend/
│   └── src/
│       ├── pages/              # Panel, mapa, sensores, alertas, ejercicios, admin, ciudadano, registro y legales
│       ├── components/         # Layout y cartel de peligro
│       ├── legal/              # Textos de Términos y Privacidad (versionados)
│       └── store/              # Sesión y consentimiento de ubicación
├── docs/documento-funcional/   # Etapas y anexos del documento
└── docker-compose.yml
```



- Inicio de sesión, control de permisos en endpoints y autorización de conexiones WebSocket.
- Panel de estado, telemetría, mapa y detalle de sensores.
- Ciclo de alertas con reconocimiento, generación de plan y resolución explícita.
- Búsqueda de alertas por zona y subzonas, fechas, estado, severidad y texto; resultados paginados desde PostgreSQL.
- Escenarios con sensores simulados seleccionados, intensidad, duración e intervalo; registro de eventos y controles de inicio/detención.
- Bitácora con integridad DVH/DVV.
- Interfaz responsive con estados de error y reintento en flujos principales.
- **Vista ciudadana** sin cuenta: clima y calidad del aire reales (Open-Meteo), avisos marcados REAL/SIMULADO, mapa de zonas y modo prueba.
- **Alerta por ubicación** con cartel de zona peligrosa, dirección para alejarse, vibración y notificaciones del navegador.
- **Registro de ciudadanos** con aceptación obligatoria de Términos, Privacidad y edad; ubicación opcional y revocable; evidencia versionada de cada consentimiento.
- **Derechos del titular**: descarga de los datos propios y baja con anonimización.
- Rol `CIUDADANO` de solo lectura, sin acceso a pantallas ni endpoints de gestión.
- Rediseño visual "cian neón + vidrio" con fondo de grilla y mapa oscuro.
- **Verificación de perfil por códigos**: un código de 6 dígitos para el correo y otro para el celular. Se guardan como HMAC, vencen a los 10 minutos, se invalidan tras 5 intentos fallidos y tienen espera entre reenvíos. El **correo se envía de verdad por SMTP** si se activa (`VERIFICACION_EMAIL_REAL`; probado con Resend) y el **SMS es simulado** (SMS de mentira en pantalla). El canal de envío es intercambiable (patrón Strategy) y si el envío real falla el código no queda guardado.
- **Planes de evacuación con la ubicación real del sensor**: el área (círculo de 500 m, 2 km o 1 km según la estrategia) se centra en las coordenadas del sensor y la población se estima con una densidad de referencia (supuesto, no dato censal). Los puntos de encuentro son los dos distritos más cercanos: no existe un catastro de refugios.
- **Errores en rutas asíncronas**: se incorporó `express-async-errors`; antes, un error de base de datos dentro de un handler `async` terminaba el proceso del servidor.
- **Seguridad de sesión**: `JWT_SECRET` y `AES_SECRET_KEY` son obligatorios y se validan al arrancar (sin valores por defecto); el JWT se verifica con el algoritmo fijado (HS256) y el inicio de sesión admite 10 intentos cada 15 minutos por usuario e IP.

Los escenarios se ejecutan en temporizadores del proceso Node. Un cierre ordenado marca los ejercicios activos como abortados; para despliegues multiinstancia o recuperación tras una caída abrupta se requiere un worker persistente.


**Estándares de codificación.** TypeScript con `strict` activado en backend y frontend; identificadores de dominio en español; consultas SQL siempre parametrizadas; validación de entradas en el servidor; errores de rutas asíncronas centralizados (`express-async-errors`); secretos obligatorios validados al arrancar; ramas `feat/`, `fix/` y `chore/` con Pull Request y CI en cada cambio; y una migración nueva por cada cambio de esquema.

## 4.3 Estrategia y evidencia de pruebas


| Nivel | Qué prueba | Dónde | Comando | Cantidad |
|---|---|---|---|---|
| Unitarias backend | Lógica pura: integridad DVH, geometría, estrategias de evacuación, validación de registro, secretos, límite de intentos, respaldos | `aegis-urban-backend/tests/unit` | `npm test` | 133 en 13 suites |
| Unitarias frontend | Almacenes de sesión y verificación, caché de peticiones, **paridad de traducciones es/en** | `aegis-urban-frontend/src/**/*.test.ts` | `npm test` | 18 en 4 archivos |
| Integración | API + PostgreSQL reales: sesiones, patentes, bitácora e integridad, inmutabilidad, particiones, hashes | `tests/live/integracion.test.ts` | `npm run test:live` | 10 |
| Punta a punta (E2E) | Flujos reales en Chrome (la prueba de evacuación se omite si la base aún no tiene alertas): ciudadanía, cambio de idioma, login inválido, ruta protegida, Administración con verificación de integridad, alerta → plan de evacuación | `aegis-urban-frontend/e2e/flujos.spec.ts` | `npm run test:e2e` | 6 |
| Seguridad | Autenticación, manipulación de JWT, inyección SQL, recorrido de directorios, cabeceras, CORS, fuerza bruta | `tests/live/seguridad.test.ts` | `npm run test:live` | 29 |
| Rendimiento | Latencia y throughput bajo carga concurrente, compresión | `scripts/rendimiento.mjs` | `npm run test:perf` | 5 endpoints |
| Automatización | Todo lo anterior en cada push y Pull Request | `.github/workflows/ci.yml` | GitHub Actions | 3 jobs |

Las pruebas E2E usan el Chrome instalado (Playwright con `channel: "chrome"`, sin descargar navegadores) y necesitan backend y frontend levantados. Las pruebas «en vivo» necesitan el servidor y PostgreSQL levantados (`arrancar.bat`). Cada ejecución consume intentos del limitador de login del usuario `admin` (10 cada 15 min); si se repiten muchas veces seguidas conviene reiniciar el backend. Las credenciales se pueden cambiar con `TEST_ADMIN_USER` y `TEST_ADMIN_PASS`.

#### Qué cubre la suite de seguridad

- 11 rutas protegidas responden **401** sin token; token basura, firmado con otra clave, con algoritmo `none` y vencido son rechazados.
- El login no revela si el usuario existe (mismo mensaje) y responde 400 sin campos.
- Cuatro cargas de inyección SQL en login y parámetros de consulta no dan 500 ni inician sesión, y las tablas siguen intactas.
- Un nombre de respaldo con `../` no recorre directorios.
- Helmet activo (sin `X-Powered-By`), CORS no refleja orígenes ajenos, la API no devuelve hashes de contraseña ni trazas de pila.
- 12 intentos de login seguidos terminan en **429**, y el contador vive en PostgreSQL.
- Un inicio de sesión fallido queda en la bitácora como `USER_LOGIN_FAILED` (con el motivo, nunca la contraseña) y la integridad DVH/DVV sigue válida.

#### Defecto encontrado y corregido gracias a estas pruebas

Dos inicios de sesión del mismo usuario dentro del mismo segundo generaban un JWT idéntico y la API respondía **500** por la restricción UNIQUE de `session_token.token_hash`. Ahora cada token lleva un `jti` aleatorio. Está cubierto por la prueba de integración «dos inicios de sesión simultáneos».



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

#### Técnicas de rendimiento aplicadas

| Técnica | Dónde |
|---|---|
| Carga eficiente | Paginación en el servidor para alertas; consultas parametrizadas e índices por sensor/fecha |
| Compresión | `compression` (gzip) en la API; minificación y división en *chunks* del bundle con Vite |
| Caché | Servidor: clima 120 s, avisos 30 s, zonas 10 s con `Cache-Control`. Cliente: caché de peticiones con TTL y deduplicación (`services/cache.ts`) |
| Precarga | Las rutas se precargan al pasar el mouse o enfocar un enlace (`router/paginas.ts`) |
| Lazy loading | Cada página se carga bajo demanda con `React.lazy` y `Suspense` |
| Particionado | `sensor_reading` por trimestre |



| Verificación | Resultado |
|---|---|
| Pruebas unitarias backend | 133 aprobadas |
| Pruebas unitarias frontend | 18 aprobadas |
| Integración, seguridad y roles (en vivo) | 99 aprobadas |
| Punta a punta con navegador (Playwright) | 6 aprobadas |
| Compilación TypeScript backend y frontend | Ver sección de cierre del README |
| Job de CI «en vivo» en GitHub Actions | Definido, aún no ejecutado en GitHub (requiere subir los cambios) |
| Pruebas de aceptación con usuarios | Guion y acta listos en el documento unificado (5.3); falta realizarlas con personas |


## 4.4 Operación de la base de datos


| Aspecto | Cómo funciona |
|---|---|
| Formato | `pg_dump` comprimido con gzip + manifiesto con SHA-256 |
| Modo | `BACKUP_MODO=docker` (usa `docker exec` en el contenedor `aegis_postgres`) o `local` (usa `pg_dump`/`psql` del equipo) |
| Automático | Un respaldo cada 24 h (`BACKUP_AUTOMATICO`), conserva los últimos `BACKUP_RETENCION` (7) |
| Simulacro | Restaura en una base temporal, verifica DVH/DVV y la elimina. No toca la base en uso |
| Restauración | Exige confirmación escrita, verifica el SHA-256, crea antes un respaldo de seguridad y restaura en **una sola transacción** (`-1`): si falla, no queda a medias |
| API | `GET/POST /api/admin/backups`, `POST /api/admin/backups/:archivo/simulacro`, `POST …/restaurar` (solo ADMIN_SISTEMA); el nombre de archivo se valida contra recorrido de directorios |


`sensor_reading` es una tabla particionada por rango (un trimestre por partición). La migración 015 agregó la función `asegurar_particiones_sensor_reading(n)`, que crea las que falten; corre al arrancar y cada 6 horas. Antes, la última partición cubría hasta 31/12/2026 y las lecturas fallaban desde el 01/01/2027.


- **DVH** (dígito verificador horizontal): hash de cada fila de `audit_log`. **DVV** (vertical): cadena que encadena cada fila con la anterior. Ver fundamento matemático.
- `GET /api/admin/integridad` las recalcula; el simulacro de restauración también.
- **Inmutabilidad** (migración 016): triggers que rechazan `UPDATE`, `DELETE` y `TRUNCATE` sobre `audit_log`. Un `REVOKE` no alcanza porque el usuario de la aplicación es superusuario del contenedor de desarrollo. Un superusuario aún podría desactivar el trigger; por eso DVH/DVV sigue siendo la segunda defensa, que detecta la alteración.


| Tipo | Uso | Técnica |
|---|---|---|
| Irreversible | Contraseñas | bcrypt, factor 12 |
| Irreversible | Códigos de verificación | HMAC |
| Reversible | Teléfono (columnas de nombre y DNI previstas, hoy sin uso) | AES-256-CBC (`AES_SECRET_KEY`) |


**Revisión SQA de la etapa 3:** compilación de backend y frontend aprobada; 256 pruebas aprobadas (133 + 18 + 99 + 6); simulacro de restauración disponible; prueba de carga con 0 errores; job de CI definido (sin ejecutar aún en GitHub).

---

---

[← Etapa 2 — Diseño y arquitectura](03-etapa-2-diseno.md) · [Índice](00-portada.md#índice-general) · [Etapa 4 — Release y cierre →](05-etapa-4-release.md)
