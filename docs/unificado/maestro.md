<div class="portada">

<p class="kicker">Documento Funcional de Ciclo de Vida</p>

# AEGIS Urban

<p class="subtitulo">Advanced Emergency Geographic Intelligence System — plataforma web de orquestación logística y alerta temprana ante catástrofes climáticas para ciudades inteligentes</p>

</div>

<h3 class="nonum">Ficha técnica</h3>

| Campo | Detalle |
|---|---|
| Materia | Prácticas Profesionalizantes |
| Curso | 6°3 |
| Metodología | Ciclo de vida del software en 4 etapas, con revisión SQA al cierre de cada una; ejecución ágil en 5 sprints de 2 semanas |
| Duración | 10 semanas (14/09/2026 – 20/11/2026) |
| Versión del documento | v1.0.0 |
| Fecha de edición | 19/11/2026 |
| Estado del producto | Prototipo en desarrollo: no sustituye protocolos ni autoridad de emergencia |

<h3 class="nonum">Integrantes</h3>

| N.º | Integrante |
|---|---|
| 1 | Carolina Lobo |
| 2 | Sabrina De Marco |
| 3 | Maximiliano Chaparro |
| 4 | Maximo Casanovas |
| 5 | Melina Cullari |

<h3 class="nonum">Distribución del trabajo</h3>

| Integrante | Rol asignado | Fase de intervención | Responsabilidades técnicas y entregables clave |
|---|---|---|---|
| Carolina Lobo | Product Owner y documentadora QA | Sprints 1 a 5; análisis, diseño y release | Documentación del proyecto, criterios de aceptación, plan de pruebas, manual de usuario, checklist de seguridad y coordinación de la demo |
| Sabrina De Marco | Desarrollo frontend | Sprints 1 a 5; diseño de interfaz e implementación | React, enrutamiento con carga diferida, mapa de ciudad, pantallas de alertas y simulación, i18n (ES/EN), ayuda contextual |
| Maximiliano Chaparro | Desarrollo backend core | Sprints 1 a 5; implementación | Node.js/Express, API REST, patrones de diseño (Singleton, Factory, Observer, Strategy), motor de simulación |
| Maximo Casanovas | Seguridad y base de datos | Sprints 1 a 5; diseño de datos, seguridad y pruebas | PostgreSQL, AES/bcrypt, DVH/DVV, patentes y familias, migraciones, respaldos y particiones |
| Melina Cullari | Integración full-stack y WebSockets | Sprints 1 a 5; implementación, pruebas y release | socket.io, integración de módulos, CI/CD en GitHub Actions y pruebas de integración de los flujos |

<h3 class="nonum">Índice general</h3>

<nav id="toc"></nav>

<div class="salto"></div>

# 1. Introducción, resumen ejecutivo y alcance

## 1.1 Resumen ejecutivo

**Qué es.** AEGIS Urban centraliza lecturas de sensores urbanos (inundación, incendio, viento, calidad del aire) y las convierte en alertas, planes de evacuación y avisos para la ciudadanía, con permisos por rol y una bitácora cuya integridad se puede verificar.

**Para quién.** Personal de operación y tránsito, Defensa Civil, auditoría y administración, y la ciudadanía a través de una vista pública sin cuenta.

**Qué resuelve.** La información de riesgos suele estar repartida entre sistemas y personas. El prototipo ofrece una vista común, deja rastro inalterable de las acciones, permite ensayar respuestas con sensores simulados y avisa a cada persona si está dentro o cerca de una zona de riesgo. Cada dato se rotula **REAL** (clima de Open-Meteo) o **SIMULADO** (sensores de demostración).

**Stack.** Node.js + TypeScript + Express (API REST y socket.io), React 18 + Vite + TypeScript (interfaz), PostgreSQL 16 (datos), Docker (base de datos local), GitHub Actions (integración continua).

**Estado.** Prototipo funcional con 270 pruebas automatizadas aprobadas: 133 unitarias de backend, 18 de frontend, 113 de integración, seguridad y autorización por rol contra la API y PostgreSQL reales, y 6 de punta a punta con un navegador real. Compilación de backend y frontend aprobada. Pendientes: la sesión de aceptación con usuarios (el guion y el acta están en la sección 5.3) y la primera ejecución del job de CI «en vivo» en GitHub.

**Equipo.** Cinco integrantes con roles de Product Owner/QA, frontend, backend, seguridad y base de datos, e integración (ver portada).

## 1.2 Alcance del producto

**Dentro del alcance:**

- Panel operativo, mapa de ciudad, sensores y alertas con filtros y paginación en el servidor.
- Autenticación JWT, autorización por patentes y familias, y conexiones WebSocket autorizadas.
- Ciclo de vida de alertas, plan de evacuación con estrategia según severidad y tipo, y escenarios de simulación.
- Vista ciudadana: clima y calidad del aire reales, avisos, alerta por ubicación, registro con consentimientos (Ley 25.326) y verificación de perfil por correo y celular.
- Bitácora con DVH/DVV inmutable, respaldo y restauración, particiones, interfaz en español e inglés y ayuda.

**Fuera del alcance:** despacho oficial de servicios de emergencia, navegación peatonal validada, integración con organismos oficiales (CAP), operación de hardware certificado, SMS real, catastro de refugios y garantía de seguridad de personas. Las rutas e instrucciones simuladas son demostrativas y requieren validación profesional antes de cualquier uso real.

## 1.3 Supuestos y restricciones

- El prototipo usa PostgreSQL y servicios Node.js/React; en desarrollo la base corre en Docker.
- La ciudad y sus sensores de ejemplo no representan cobertura real.
- Solo personal con permisos accede a datos operativos y administración; la ciudadanía tiene un rol de solo lectura.
- En una emergencia real: **911** (policía), **100** (bomberos) o **103** (Defensa Civil).

## 1.4 Las cuatro etapas y sus entregables

| Etapa | Qué se hizo | Entregables | Revisión SQA |
|---|---|---|---|
| 1 — Análisis y factibilidad | Problema, objetivos, actores, fuentes de alertas, factibilidades y planificación | Objetivos, factibilidades, plan de 5 sprints y riesgos | Alcance acordado y riesgos identificados |
| 2 — Diseño y arquitectura | Stack, base de datos, requisitos, UML, seguridad e interfaz | RF-01 a RF-13, RNF-01 a RNF-11, DER, clases, casos de uso, DSS y matriz de patentes | Trazabilidad de cada requisito a un módulo del código |
| 3 — Implementación y testing | Construcción por módulos, pruebas, operación de BD | Código, migraciones 001–017, 270 pruebas, script de carga, CI y respaldos | Pruebas automatizadas aprobadas y compilación limpia |
| 4 — Release y mantenimiento | Versión, aceptación, reversión, manuales y cierre | Notas v1.0.0, manuales, plan de mantenimiento y anexos | Checklist de pre-release y brechas declaradas |

<div class="salto"></div>

# 2. Etapa 1 — Análisis y factibilidad

## 2.1 Problema y objetivos

La información sobre amenazas urbanas puede estar repartida entre sensores, tableros internos y canales de organismos distintos. Una vista común puede ayudar a localizar eventos y coordinar tareas, pero un prototipo técnico no sustituye la confirmación ni las instrucciones de una autoridad de emergencia.

**Objetivo general.** Construir una aplicación web que reúna telemetría, alertas y herramientas de ejercicio para apoyar la observación y coordinación operativa en la ciudad, y que informe a la ciudadanía con datos rotulados por su origen.

**Objetivos específicos.**

- Mostrar la condición, última lectura y ubicación de sensores.
- Consultar alertas por estado, severidad, período y zona.
- Conservar responsables y marcas de tiempo de las acciones, con integridad verificable (DVH/DVV).
- Ensayar eventos con escenarios reproducibles y sensores simulados.
- Ofrecer una vista ciudadana con clima real y alerta por ubicación, respetando la Ley 25.326.
- Garantizar respaldo, restauración y trazabilidad de los datos.

## 2.2 Contexto y actores

| Actor | Casos de uso |
|---|---|
| Operador / Tránsito | Iniciar y cerrar sesión, revisar mapa, telemetría y alertas |
| Defensa Civil | Reconocer una alerta, solicitar el plan de evacuación, ejecutar simulaciones |
| Auditor | Consultar la bitácora y verificar su integridad |
| Administrador | Gestionar usuarios, familias, respaldos y restauración |
| Ciudadanía | Ver clima y avisos, recibir aviso por ubicación, gestionar sus datos |
| Motor de simulación | Emitir lecturas marcadas como simuladas y activar las reglas de alerta |

![Contexto del sistema](documento-funcional/img/01_contexto.svg)

## 2.3 Fuentes de alertas e investigación (protocolo CAP)

AEGIS recibe detecciones de sensores y el clima real de Open-Meteo. Cada alerta preserva su origen (REAL o SIMULADO), la hora de emisión, el área afectada y su estado.

El **Common Alerting Protocol (CAP)** es el formato interoperable para comunicar emisor, urgencia, severidad, certeza, período y área geográfica. Si una autoridad no publica CAP, conviene sumar un adaptador dedicado que normalice el aviso al modelo interno sin ocultar su fuente. **Estado actual:** AEGIS no está conectado a ninguna API oficial de alertas; el adaptador CAP es trabajo futuro y no se presenta nada como instrucción oficial.

## 2.4 Análisis de factibilidades

| Factibilidad | Análisis | Conclusión |
|---|---|---|
| Humana | Equipo de 5 personas con roles complementarios (documentación y QA, frontend, backend, seguridad y datos, integración) durante 10 semanas | Viable |
| Técnica | Stack estándar (Node.js, React, PostgreSQL) con herramientas libres; el código corre en un equipo con Docker, y la prueba de carga y las pruebas en vivo lo confirman | Viable y demostrada en el prototipo |
| Económica | Sin licencias: software libre, Open-Meteo gratuito y SMTP de volumen bajo. Un uso público requeriría hosting, SMS real y una fuente oficial | Viable para el prototipo; costos a definir para operar |
| Legal | **Ley 25.326** de Protección de Datos Personales: consentimiento expreso y versionado, ubicación opcional y revocable, derecho de acceso (descarga de datos) y baja con anonimización; la AAIP es la autoridad de control | Aplicada en el código; los textos requieren revisión de un profesional |

## 2.5 Límites y alcance

Quedan fuera de alcance el despacho de equipos de emergencia, el cálculo certificado de rutas, las comunicaciones oficiales de emergencia y la integración con organismos. La operación pública depende de acuerdos, fuentes autorizadas y un responsable institucional para corregir o retirar avisos.

## 2.6 Planificación estratégica

El proyecto se planificó en **5 sprints de 2 semanas (10 semanas)**. El detalle original por área figura a continuación y se contrasta con lo realizado en la sección 5.1.

@@include 02-analisis-diseno.md | SECCIÓN 3 — PLANIFICACIÓN DE SPRINTS | 0 | skipTitle

### Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Datos simulados confundidos con oficiales | Media | Alto | Rótulo REAL/SIMULADO en cada aviso y recordatorio de 911/100/103 |
| Fallo de la fuente de clima | Media | Medio | Caché con TTL y mensaje de degradación en la vista ciudadana |
| Pérdida o corrupción de datos | Baja | Alto | Respaldo diario con SHA-256, simulacro de restauración y DVH/DVV |
| Incumplimiento de la Ley 25.326 | Media | Alto | Consentimientos versionados, ubicación opcional y baja con anonimización; revisión legal pendiente |
| Estado en memoria si se escala a varias instancias | Media al escalar | Medio | Limitador y caché ya compartidos en PostgreSQL (migración 017); las simulaciones activas aún requieren un worker persistente |
| Alcance mayor que el tiempo disponible | Alta | Medio | Priorización por sprint; brechas declaradas en la sección 5.1 |

**Revisión SQA de la etapa 1:** objetivos medibles definidos; actores identificados; riesgos con mitigación; factibilidad legal tratada.

<div class="salto"></div>

# 3. Etapa 2 — Diseño y arquitectura

## 3.1 Elección tecnológica justificada

@@include 01-arquitectura.md | 1. Decisiones de Stack | 0 | skipTitle

## 3.2 Diseño de la base de datos

El modelo lógico (DER) y su descripción detallada se incluyen en la sección 3.5. El esquema se versiona en `aegis-urban-backend/database/migrations/`; una migración aplicada no se edita, los cambios van en una nueva.

| Migración | Contenido |
|---|---|
| 001 | Usuarios, familias, patentes y tokens de sesión |
| 002 | Nodos de ciudad, tipos de sensor, sensores y lecturas (`sensor_reading` particionada por trimestre) |
| 003 | Alertas, planes de evacuación y escenarios de simulación |
| 004 | Bitácora (`audit_log`) y su control de integridad |
| 005 | Datos iniciales |
| 006–008 | Triggers de telemetría, ciclo de vida de la alerta y calidad del aire |
| 009 | Permisos de la API (recurso y método por patente) |
| 010–011 | Escenarios configurables y fecha de actualización de alertas |
| 012 | Rol CIUDADANO y consentimientos (`user_consent`) |
| 013 | Verificación de perfil por códigos (`verification_code`) |
| 014 | Estrategias de evacuación |
| 015 | Particiones futuras automáticas y respaldos |
| 016 | Bitácora inmutable (triggers contra UPDATE, DELETE y TRUNCATE) |
| 017 | Estado compartido entre instancias: `rate_limit` (limitador) y `shared_cache` (caché) |

**Particionamiento trimestral.** `sensor_reading` se particiona por rango de fecha, una partición por trimestre. La función `asegurar_particiones_sensor_reading(n)` crea las futuras; corre al arrancar y cada 6 horas. Antes de la migración 015 la última partición terminaba el 31/12/2026 y las lecturas habrían fallado desde el 01/01/2027.

![Modelo de datos](documento-funcional/img/05_modelo_datos.svg)

## 3.3 Especificación de requerimientos

### Requerimientos funcionales

@@include 03-especificacion-sistema.md | 3. Requerimientos funcionales | 1 | skipTitle

### Requerimientos no funcionales

@@include 03-especificacion-sistema.md | 4. Requerimientos no funcionales | 1 | skipTitle

## 3.4 Modelado UML

### Actores y casos de uso

Los **20 casos de uso** del diseño original (UC-01 a UC-20) son los siguientes. Los UC-16 (exportar reporte de auditoría), UC-19 (gestionar sensores) y UC-20 (gestionar nodos de ciudad) fueron diseñados pero **no están implementados** en esta versión; el resto sí.

@@include 02-analisis-diseno.md | SECCIÓN 1 — DIAGRAMA DE CASOS DE USO (UML) | 1 | skipTitle

### Diagrama de clases y patrones de diseño

Los cinco patrones exigidos están en el código: **Singleton** (`DatabaseConnection`, `EventBus`), **Factory Method** (`core/factory/SensorFactory.ts`), **Observer** (`EventBus` y sus handlers), **Strategy** (estrategias de evacuación en `core/strategies`) y **Composite** (patentes y familias en `core/composite`).

@@include 02-analisis-diseno.md | SECCIÓN 2 — DIAGRAMA DE CLASES: NÚCLEO DE PATRONES | 1 | skipTitle

### Especificación dinámica (DSS) de los flujos críticos

@@include 03-especificacion-sistema.md | 6. Especificación dinámica (DSS) | 1 | skipTitle

### Especificación de casos de uso clave

@@include 03-especificacion-sistema.md | 7. Especificación de casos de uso clave | 1 | skipTitle

## 3.5 Arquitectura técnica

### Visión de contexto y componentes

![Arquitectura](documento-funcional/img/07_arquitectura.svg)

### Estructura de carpetas

@@include 01-arquitectura.md | 2. Estructura de Carpetas — Backend | 1 | skipTitle
@@include 01-arquitectura.md | 3. Estructura de Carpetas — Frontend | 1 | skipTitle

### Modelo entidad-relación (DER lógico)

@@include 01-arquitectura.md | 4. Modelo Entidad-Relación (DER Lógico) | 1 | skipTitle

### Tiempo real con WebSockets

El servidor usa **socket.io** (`modules/websocket/SocketServer.ts`). Cada conexión se autoriza con el JWT y el servidor emite eventos del `EventBus` (lectura nueva, alerta creada o actualizada, evacuación iniciada) a los clientes autorizados, por lo que el frontend no necesita consultar de forma periódica.

### Seguridad: DVH + DVV

@@include 01-arquitectura.md | 5. Sistema DVH + DVV — Fundamento Matemático | 1 | skipTitle
@@include 01-arquitectura.md | 8. SQL — Tabla `AUDIT_LOG` con Restricciones de Integridad | 1 | skipTitle
@@include 01-arquitectura.md | 9. Ejemplo Numérico de Secuencia DVH/DVV | 1 | skipTitle

### Matriz de patentes y familias

@@include 02-analisis-diseno.md | SECCIÓN 4 — MATRIZ DE PATENTES Y FAMILIAS (Composite) | 1 | skipTitle

![Roles y permisos](documento-funcional/img/roles_permisos.svg)

Las patentes también gobiernan la interfaz: el login devuelve las patentes efectivas de la familia (`permisos`) y la web muestra u oculta botones y secciones según ellas. La API sigue validando cada petición.

## 3.6 Diseño de interfaz

@@include documento-funcional/03-etapa-2-diseno.md | 2.5 Diseño de interfaz y experiencia ciudadana | 1 | skipTitle

**Idiomas y ayuda.** Selector ES/EN con 551 claves por idioma (un test verifica que ambos coincidan), página de ayuda `/ayuda` y ayudas emergentes (ⓘ) en pantallas clave.

**Revisión SQA de la etapa 2:** cada requisito RF/RNF se traza a un módulo; los diagramas se corresponden con el código; los patrones están localizados en archivos concretos; la matriz de permisos coincide con la base.

<div class="salto"></div>

# 4. Etapa 3 — Implementación, construcción y testing

## 4.1 Preparación del entorno

Requisitos: Node.js 20+, Docker Desktop y Git. En Windows, `arrancar.bat` reutiliza o crea el contenedor `aegis_postgres`, aplica las migraciones 006–017 y los datos iniciales, genera el `.env` con secretos aleatorios si falta, instala dependencias y abre el backend (puerto 3001) y el frontend (puerto 5173). `detener.bat` los detiene. `docker-compose.yml` monta las migraciones solo al crear un volumen vacío.

| Dónde | Comando | Qué hace |
|---|---|---|
| backend | `npm run dev` | API con recarga automática |
| backend | `npm test` | 133 pruebas unitarias |
| backend | `npm run test:live` | 113 pruebas de integración y seguridad contra la API y PostgreSQL |
| backend | `npm run test:perf` | Prueba de carga con percentiles |
| backend | `npm run build` | Compila a JavaScript |
| frontend | `npm run dev` / `npm test` / `npm run build` | Web en Vite, 18 pruebas y bundle de producción |
| frontend | `npm run test:e2e` | 6 pruebas de punta a punta con Chrome real (requiere backend y frontend levantados) |

## 4.2 Construcción por módulos y estándares de codificación

@@include documento-funcional/04-etapa-3-implementacion.md | 3.1 Estructura del proyecto | 1 | skipTitle

@@include documento-funcional/04-etapa-3-implementacion.md | 3.2 Funcionalidades implementadas | 1 | skipTitle

**Estándares de codificación.** TypeScript con `strict` activado en backend y frontend; identificadores de dominio en español; consultas SQL siempre parametrizadas; validación de entradas en el servidor; errores de rutas asíncronas centralizados (`express-async-errors`); secretos obligatorios validados al arrancar; ramas `feat/`, `fix/` y `chore/` con Pull Request y CI en cada cambio; y una migración nueva por cada cambio de esquema.

## 4.3 Estrategia y evidencia de pruebas

@@include 05-pruebas-y-rendimiento.md | Estrategia | 1 | skipTitle

@@include 05-pruebas-y-rendimiento.md | Rendimiento | 1 | skipTitle

@@include 05-pruebas-y-rendimiento.md | Registro de resultados | 1 | skipTitle

## 4.4 Operación de la base de datos

@@include 06-base-de-datos.md | Respaldo y restauración | 1 | skipTitle
@@include 06-base-de-datos.md | Particiones | 1 | skipTitle
@@include 06-base-de-datos.md | Verificación de integridad | 1 | skipTitle
@@include 06-base-de-datos.md | Cifrado | 1 | skipTitle

**Revisión SQA de la etapa 3:** compilación de backend y frontend aprobada; 270 pruebas aprobadas (133 + 18 + 113 + 6); simulacro de restauración disponible; prueba de carga con 0 errores; job de CI definido (sin ejecutar aún en GitHub).

<div class="salto"></div>

# 5. Etapa 4 — Release, mantenimiento y cierre

## 5.1 Notas de versión v1.0.0

**Incluye:** panel operativo, mapa, sensores y alertas con filtros; ciclo de alerta con plan de evacuación por estrategia; escenarios de simulación; vista ciudadana con clima real y alerta por ubicación; registro con consentimientos y verificación por correo (real, opcional) y celular (simulado); bitácora inmutable con DVH/DVV; respaldos, simulacro y restauración; particiones automáticas; interfaz ES/EN con ayuda; patentes aplicadas a la interfaz; pruebas de integración, seguridad y carga.

**Mejoras de cierre:** los inicios de sesión fallidos se registran en la bitácora (`USER_LOGIN_FAILED`, sin la contraseña); el limitador de tasa y la caché del clima se comparten entre instancias vía PostgreSQL; hay pruebas de punta a punta con navegador real.

**Corrección incluida:** dos inicios de sesión del mismo usuario en el mismo segundo producían un error 500 por token duplicado; ahora cada token lleva un identificador único.

**Planificado y no realizado (declarado):**

| Previsto en el plan original | Estado |
|---|---|
| Documentación con Swagger | No realizado; la API se documenta en los anexos |
| Stress test con k6 y pgbench | Reemplazado por `scripts/rendimiento.mjs` (Node, sin dependencias); pgbench no ejecutado |
| Pruebas de punta a punta con Playwright | Realizado: 6 flujos con Chrome real (`npm run test:e2e`) |
| Despliegue en Render y Vercel con HTTPS | No realizado; solo ejecución local |
| Respaldo con node-cron y `BackupScheduler` | Implementado con un temporizador propio (`backup/mantenimiento.ts`) |
| UC-16 exportar reporte, UC-19 gestionar sensores, UC-20 gestionar nodos | No implementados |
| Verificación periódica de DVH/DVV por cron | La verificación es bajo demanda y en el simulacro de restauración |

## 5.2 Checklist pre-release

| Control | Estado |
|---|---|
| Compilación TypeScript de backend y frontend | Aprobada |
| 133 pruebas unitarias backend y 18 de frontend | Aprobadas |
| 113 pruebas en vivo (integración, seguridad y 72 de autorización por rol) | Aprobadas |
| 6 pruebas de punta a punta con navegador (Playwright) | Aprobadas |
| Migraciones 001–017 aplicadas en la base local | Aprobado |
| Respaldo con restauración verificada (simulacro) | Disponible |
| Secretos fuera del código y validados al arrancar | Aprobado |
| Datos simulados rotulados | Aprobado |
| Job de CI con PostgreSQL de servicio | Definido; pendiente de primera ejecución |
| Revisión legal de los textos por un profesional | Pendiente |
| Pruebas de aceptación con usuarios | Pendiente |

## 5.3 Pruebas de aceptación (UAT)

@@include documento-funcional/05-etapa-4-release.md | 4.2 Pruebas de aceptación con usuarios | 1 | skipTitle

### Guion y acta de la sesión de aceptación

Los escenarios de la tabla anterior se ejecutan con personas reales (una por perfil) siguiendo este guion. El resultado se registra en el acta y **solo entonces** el estado pasa de «Pendiente» a «Aprobado».

| Paso | Qué hace la persona | Qué se observa | Aprobado | Observaciones |
|---|---|---|---|---|
| 1 | Entra como ciudadanía y mira el clima y los avisos | Entiende qué es REAL y qué es SIMULADO sin ayuda | ☐ Sí ☐ No | |
| 2 | Activa «Permitir ubicación» y prueba el modo prueba | Comprende el cartel de peligro y hacia dónde alejarse | ☐ Sí ☐ No | |
| 3 | Se registra y verifica correo y celular | Completa el registro en menos de 5 minutos | ☐ Sí ☐ No | |
| 4 | Como Defensa Civil reconoce una alerta e inicia la evacuación | Interpreta el plan y sus supuestos | ☐ Sí ☐ No | |
| 5 | Como auditoría verifica la integridad | Entiende el resultado VÁLIDA / COMPROMETIDA | ☐ Sí ☐ No | |
| 6 | Como administración crea un respaldo y hace el simulacro | Distingue el simulacro de la restauración real | ☐ Sí ☐ No | |
| 7 | Cambia el idioma y abre la ayuda | Encuentra la ayuda sin asistencia | ☐ Sí ☐ No | |

**Acta:** fecha ____ / ____ / ______ · Participantes: __________________ · Incidencias: __________________ · Conformidad: ☐ Aprobado ☐ Aprobado con observaciones ☐ Rechazado · Firmas: __________________

## 5.4 Plan de reversión (vuelta atrás)

Antes de una migración se genera un respaldo verificado (`POST /api/admin/backups`) y se prueba con el simulacro. Si la nueva versión de la API falla, se vuelve a la versión previa y se deshabilitan las rutas que dependan de la migración. No se borran escenarios ni eventos para intentar revertir. Para recuperar datos, la restauración exige confirmación escrita, verifica el SHA-256, crea antes un respaldo de seguridad y se ejecuta en una sola transacción. La reversión del esquema se prepara y revisa por separado, preservando la auditoría.

## 5.5 Manuales de usuario

La misma guía está dentro de la aplicación, en `/ayuda`.

@@include 04-manual-de-usuario.md | Idioma | 1 | skipTitle
@@include 04-manual-de-usuario.md | Ciudadanía | 1
@@include 04-manual-de-usuario.md | Operación y tránsito | 1
@@include 04-manual-de-usuario.md | Defensa Civil | 1
@@include 04-manual-de-usuario.md | Auditoría | 1
@@include 04-manual-de-usuario.md | Administración | 1
@@include 04-manual-de-usuario.md | Problemas frecuentes | 1

### Preguntas frecuentes

| Pregunta | Respuesta |
|---|---|
| ¿Qué significan REAL y SIMULADO? | REAL es un dato de una fuente externa (clima de Open-Meteo). SIMULADO lo generan los sensores virtuales. Las simulaciones no son alertas oficiales |
| ¿Cómo funciona la alerta por ubicación? | Con tu permiso, el navegador envía tu posición solo para calcular la distancia a cada zona; no se guarda |
| ¿Por qué debo verificar mi perfil? | Para confirmar que el correo y el celular son tuyos mediante un código de 6 dígitos en cada uno |
| ¿Qué son DVH y DVV? | Huellas (hash) de cada fila de la bitácora: el DVH protege cada fila y el DVV las encadena |
| ¿Cómo hago un respaldo? | Administración → Respaldos → «Crear respaldo ahora». Hay uno automático cada 24 h |
| ¿Cómo descargo mis datos o elimino mi cuenta? | En la vista ciudadana, sección «Mis datos» |

## 5.6 Plan de mantenimiento

@@include documento-funcional/05-etapa-4-release.md | 4.5 Plan de mantenimiento | 1 | skipTitle

## 5.7 Anexos

### Anexo A — Decisiones de producto

@@include documento-funcional/06-anexos.md | Anexo A — Decisión de producto: roles y alertas públicas | 1 | skipTitle

### Anexo B — Contratos de API

@@include documento-funcional/06-anexos.md | Anexo B — Contratos de API | 1 | skipTitle

### Anexo C — Glosario

@@include documento-funcional/06-anexos.md | Anexo C — Glosario | 1 | skipTitle

### Anexo D — Backlog priorizado

@@include documento-funcional/06-anexos.md | Anexo D — Backlog priorizado | 1 | skipTitle

### Anexo E — Marco legal (Ley 25.326)

@@include documento-funcional/06-anexos.md | Anexo E — Marco legal y consentimientos | 1 | skipTitle

## 5.8 Cierre y trabajo futuro

AEGIS Urban cumple, como prototipo, el ciclo de vida completo: se analizó el problema, se diseñó y modeló, se construyó con los patrones exigidos, se probó de forma automatizada y se dejó documentado. No está conectado a fuentes oficiales y no debe presentarse como canal de instrucciones de emergencia.

**Prioridades siguientes:** envío real de SMS; catastro de refugios y rutas por calles; revisión legal de los textos; integrar una fuente oficial por CAP; suscripciones por zona y avisos con la aplicación cerrada (PWA); realizar la sesión de aceptación con usuarios; pasar limitador y caché a Redis si el tráfico lo exige; y un worker persistente para las simulaciones activas al escalar a varias instancias.

**Revisión SQA de la etapa 4:** brechas respecto del plan original declaradas (sección 5.1); checklist de pre-release con estado verdadero; manuales por perfil; plan de reversión probado con el simulacro de restauración.
