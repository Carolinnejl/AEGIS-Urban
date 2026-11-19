<!-- Archivo generado por docs/unificado/generar-markdown.cjs. No editar: cambiar el maestro o las fuentes y regenerar. -->
[← README](../../README.md) · [Índice](00-portada.md#índice-general) · [Introducción y alcance →](01-introduccion.md)

# AEGIS Urban

**Documento Funcional de Ciclo de Vida**

> Advanced Emergency Geographic Intelligence System — plataforma web de orquestación logística y alerta temprana ante catástrofes climáticas para ciudades inteligentes

### Ficha técnica

| Campo | Detalle |
|---|---|
| Materia | Prácticas Profesionalizantes |
| Curso | 6°3 |
| Metodología | Ciclo de vida del software en 4 etapas, con revisión SQA al cierre de cada una; ejecución ágil en 5 sprints de 2 semanas |
| Duración | 8 meses (10/03/2026 – 20/11/2026) |
| Versión del documento | v1.0.0 |
| Fecha de edición | 19/11/2026 |
| Estado del producto | Prototipo en desarrollo: no sustituye protocolos ni autoridad de emergencia |

### Integrantes

| N.º | Integrante |
|---|---|
| 1 | Carolina Lobo |
| 2 | Sabrina De Marco |
| 3 | Maximiliano Chaparro |
| 4 | Maximo Casanovas |
| 5 | Melina Cullari |

### Distribución del trabajo

| Integrante | Rol asignado | Fase de intervención | Responsabilidades técnicas y entregables clave |
|---|---|---|---|
| Carolina Lobo | Product Owner y documentadora QA | Sprints 1 a 5; análisis, diseño y release | Documentación del proyecto, criterios de aceptación, plan de pruebas, manual de usuario, checklist de seguridad y coordinación de la demo |
| Sabrina De Marco | Desarrollo frontend | Sprints 1 a 5; diseño de interfaz e implementación | React, enrutamiento con carga diferida, mapa de ciudad, pantallas de alertas y simulación, i18n (ES/EN), ayuda contextual |
| Maximiliano Chaparro | Desarrollo backend core | Sprints 1 a 5; implementación | Node.js/Express, API REST, patrones de diseño (Singleton, Factory, Observer, Strategy), motor de simulación |
| Maximo Casanovas | Seguridad y base de datos | Sprints 1 a 5; diseño de datos, seguridad y pruebas | PostgreSQL, AES/bcrypt, DVH/DVV, patentes y familias, migraciones, respaldos y particiones |
| Melina Cullari | Integración full-stack y WebSockets | Sprints 1 a 5; implementación, pruebas y release | socket.io, integración de módulos, CI/CD en GitHub Actions y pruebas de integración de los flujos |

### Índice general

- [1. Introducción, resumen ejecutivo y alcance](01-introduccion.md#1-introducción-resumen-ejecutivo-y-alcance)
  - [1.1 Resumen ejecutivo](01-introduccion.md#11-resumen-ejecutivo)
  - [1.2 Alcance del producto](01-introduccion.md#12-alcance-del-producto)
  - [1.3 Supuestos y restricciones](01-introduccion.md#13-supuestos-y-restricciones)
  - [1.4 Las cuatro etapas y sus entregables](01-introduccion.md#14-las-cuatro-etapas-y-sus-entregables)
- [2. Etapa 1 — Análisis y factibilidad](02-etapa-1-analisis.md#2-etapa-1--análisis-y-factibilidad)
  - [2.1 Problema y objetivos](02-etapa-1-analisis.md#21-problema-y-objetivos)
  - [2.2 Contexto y actores](02-etapa-1-analisis.md#22-contexto-y-actores)
  - [2.3 Fuentes de alertas e investigación (protocolo CAP)](02-etapa-1-analisis.md#23-fuentes-de-alertas-e-investigación-protocolo-cap)
  - [2.4 Análisis de factibilidades](02-etapa-1-analisis.md#24-análisis-de-factibilidades)
  - [2.5 Límites y alcance](02-etapa-1-analisis.md#25-límites-y-alcance)
  - [2.6 Planificación estratégica](02-etapa-1-analisis.md#26-planificación-estratégica)
    - [Cronograma General (Gantt)](02-etapa-1-analisis.md#cronograma-general-gantt)
    - [Sprint 1 — Fundamentos e Infraestructura (14/09 – 25/09)](02-etapa-1-analisis.md#sprint-1--fundamentos-e-infraestructura-1409--2509)
    - [Sprint 2 — Seguridad y Control de Acceso (28/09 – 09/10)](02-etapa-1-analisis.md#sprint-2--seguridad-y-control-de-acceso-2809--0910)
    - [Sprint 3 — Patrones Core y Telemetría Real-time (12/10 – 23/10)](02-etapa-1-analisis.md#sprint-3--patrones-core-y-telemetría-real-time-1210--2310)
    - [Sprint 4 — UI Ciudad y Motor de Simulación (26/10 – 06/11)](02-etapa-1-analisis.md#sprint-4--ui-ciudad-y-motor-de-simulación-2610--0611)
    - [Sprint 5 — Testing, Auditoría UI y Entrega Final (09/11 – 20/11)](02-etapa-1-analisis.md#sprint-5--testing-auditoría-ui-y-entrega-final-0911--2011)
    - [Riesgos](02-etapa-1-analisis.md#riesgos)
- [3. Etapa 2 — Diseño y arquitectura](03-etapa-2-diseno.md#3-etapa-2--diseño-y-arquitectura)
  - [3.1 Elección tecnológica justificada](03-etapa-2-diseno.md#31-elección-tecnológica-justificada)
  - [3.2 Diseño de la base de datos](03-etapa-2-diseno.md#32-diseño-de-la-base-de-datos)
  - [3.3 Especificación de requerimientos](03-etapa-2-diseno.md#33-especificación-de-requerimientos)
    - [Requerimientos funcionales](03-etapa-2-diseno.md#requerimientos-funcionales)
    - [Requerimientos no funcionales](03-etapa-2-diseno.md#requerimientos-no-funcionales)
  - [3.4 Modelado UML](03-etapa-2-diseno.md#34-modelado-uml)
    - [Actores y casos de uso](03-etapa-2-diseno.md#actores-y-casos-de-uso)
    - [Diagrama de clases y patrones de diseño](03-etapa-2-diseno.md#diagrama-de-clases-y-patrones-de-diseño)
    - [Especificación dinámica (DSS) de los flujos críticos](03-etapa-2-diseno.md#especificación-dinámica-dss-de-los-flujos-críticos)
    - [Especificación de casos de uso clave](03-etapa-2-diseno.md#especificación-de-casos-de-uso-clave)
  - [3.5 Arquitectura técnica](03-etapa-2-diseno.md#35-arquitectura-técnica)
    - [Visión de contexto y componentes](03-etapa-2-diseno.md#visión-de-contexto-y-componentes)
    - [Estructura de carpetas](03-etapa-2-diseno.md#estructura-de-carpetas)
    - [Modelo entidad-relación (DER lógico)](03-etapa-2-diseno.md#modelo-entidad-relación-der-lógico)
    - [Tiempo real con WebSockets](03-etapa-2-diseno.md#tiempo-real-con-websockets)
    - [Seguridad: DVH + DVV](03-etapa-2-diseno.md#seguridad-dvh--dvv)
    - [Matriz de patentes y familias](03-etapa-2-diseno.md#matriz-de-patentes-y-familias)
  - [3.6 Diseño de interfaz](03-etapa-2-diseno.md#36-diseño-de-interfaz)
- [4. Etapa 3 — Implementación, construcción y testing](04-etapa-3-implementacion.md#4-etapa-3--implementación-construcción-y-testing)
  - [4.1 Preparación del entorno](04-etapa-3-implementacion.md#41-preparación-del-entorno)
  - [4.2 Construcción por módulos y estándares de codificación](04-etapa-3-implementacion.md#42-construcción-por-módulos-y-estándares-de-codificación)
  - [4.3 Estrategia y evidencia de pruebas](04-etapa-3-implementacion.md#43-estrategia-y-evidencia-de-pruebas)
  - [4.4 Operación de la base de datos](04-etapa-3-implementacion.md#44-operación-de-la-base-de-datos)
- [5. Etapa 4 — Release, mantenimiento y cierre](05-etapa-4-release.md#5-etapa-4--release-mantenimiento-y-cierre)
  - [5.1 Notas de versión v1.0.0](05-etapa-4-release.md#51-notas-de-versión-v100)
  - [5.2 Checklist pre-release](05-etapa-4-release.md#52-checklist-pre-release)
  - [5.3 Pruebas de aceptación (UAT)](05-etapa-4-release.md#53-pruebas-de-aceptación-uat)
    - [Guion y acta de la sesión de aceptación](05-etapa-4-release.md#guion-y-acta-de-la-sesión-de-aceptación)
  - [5.4 Plan de reversión (vuelta atrás)](05-etapa-4-release.md#54-plan-de-reversión-vuelta-atrás)
  - [5.5 Manuales de usuario](05-etapa-4-release.md#55-manuales-de-usuario)
    - [Ciudadanía](05-etapa-4-release.md#ciudadanía)
    - [Operación y tránsito](05-etapa-4-release.md#operación-y-tránsito)
    - [Defensa Civil](05-etapa-4-release.md#defensa-civil)
    - [Auditoría](05-etapa-4-release.md#auditoría)
    - [Administración](05-etapa-4-release.md#administración)
    - [Problemas frecuentes](05-etapa-4-release.md#problemas-frecuentes)
    - [Preguntas frecuentes](05-etapa-4-release.md#preguntas-frecuentes)
  - [5.6 Plan de mantenimiento](05-etapa-4-release.md#56-plan-de-mantenimiento)
  - [5.7 Anexos](05-etapa-4-release.md#57-anexos)
    - [Anexo A — Decisiones de producto](05-etapa-4-release.md#anexo-a--decisiones-de-producto)
    - [Anexo B — Contratos de API](05-etapa-4-release.md#anexo-b--contratos-de-api)
    - [Anexo C — Glosario](05-etapa-4-release.md#anexo-c--glosario)
    - [Anexo D — Backlog priorizado](05-etapa-4-release.md#anexo-d--backlog-priorizado)
    - [Anexo E — Marco legal (Ley 25.326)](05-etapa-4-release.md#anexo-e--marco-legal-ley-25326)
  - [5.8 Cierre y trabajo futuro](05-etapa-4-release.md#58-cierre-y-trabajo-futuro)


---

[Leer todo en un solo archivo](../AEGIS-Urban-Documento-Funcional-Unificado.md) · [PDF](../pdf/AEGIS-Urban-Documento-Funcional-Unificado.pdf)

---

[← README](../../README.md) · [Índice](00-portada.md#índice-general) · [Introducción y alcance →](01-introduccion.md)
