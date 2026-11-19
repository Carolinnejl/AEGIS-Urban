# Etapa 3 — Implementación y testing

**En esta página:** entorno, módulos implementados, evidencia de pruebas y puesta en marcha.

En esta etapa el diseño se lleva a código. El estado se describe según el repositorio actual; una migración escrita pero no aplicada no se considera disponible en la base local.

## 3.1 Estructura del proyecto

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

## 3.2 Funcionalidades implementadas

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

## 3.3 Pruebas y compilación

La suite automatizada cubre cálculo de integridad, matriz de autorización por familia, cálculo de cercanía a zonas de riesgo, avisos derivados del clima validación del registro con sus consentimientos, estrategias de evacuación, validación de secretos, límite de intentos y verificación por códigos.

| Verificación | Resultado registrado |
|---|---|
| Pruebas backend (unitarias) | 133 pruebas aprobadas en 13 suites |
| Pruebas frontend | 18 pruebas aprobadas (sesión, verificación, caché y paridad de traducciones) |
| Integración y seguridad contra API y PostgreSQL reales | 41 pruebas aprobadas (`npm run test:live`) y 6 de punta a punta (`npm run test:e2e`); ver [pruebas y rendimiento](../05-pruebas-y-rendimiento.md) |
| Compilación TypeScript backend | Aprobada |
| Compilación TypeScript y bundle frontend | Aprobada |
| Job de CI con PostgreSQL de servicio | Definido; aún no ejecutado en GitHub |
| Pruebas de aceptación con operadores y ciudadanía | Pendientes |

Las pruebas unitarias de roles simulan la capa de datos; las pruebas en vivo (`tests/live`) cubren API y PostgreSQL reales, incluida la inmutabilidad de la bitácora y las particiones.

## 3.4 Migraciones y puesta en marcha

El esquema se versiona en `aegis-urban-backend/database/migrations/`. Las migraciones 006 a 016 son repetibles y se aplican en orden. La `010_configurable_scenarios.sql` amplía los tipos de escenario y sus permisos; la `012_citizen_role.sql` agrega el rol `CIUDADANO`, la tabla `user_consent` y la columna `users.terms_verified_at`. La `013_profile_verification.sql` agrega la tabla `verification_code`, las marcas `email_verified_at`, `phone_verified_at` y `verified_at`, y los permisos de verificación. La `014_evacuation_strategies.sql` corrige la restricción de `evacuation_plan.strategy_used`, que solo aceptaba nombres que ninguna estrategia usaba y hacía fallar todo plan de evacuación.

`arrancar.bat` (Windows) reutiliza el contenedor `aegis_postgres` si ya existe, aplica las migraciones 006–017, carga los datos iniciales, genera el `.env` si falta y abre backend y frontend.

Docker Compose monta las migraciones en la inicialización de un volumen vacío; no vuelve a ejecutarlas en un volumen ya creado. Confirmar la migración aplicada antes de probar filtros y escenarios. Configuración, secretos y comandos de desarrollo están en el [README principal](../../README.md).

[← Etapa 2 — Diseño y arquitectura](03-etapa-2-diseno.md) · [Índice](README.md) · [Etapa 4 — Release y mantenimiento →](05-etapa-4-release.md)
