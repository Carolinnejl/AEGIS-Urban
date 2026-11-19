<!-- Archivo generado por docs/unificado/generar-markdown.cjs. No editar: cambiar el maestro o las fuentes y regenerar. -->
[← Portada e índice](00-portada.md) · [Índice](00-portada.md#índice-general) · [Etapa 1 — Análisis y factibilidad →](02-etapa-1-analisis.md)

# 1. Introducción, resumen ejecutivo y alcance

## 1.1 Resumen ejecutivo

**Qué es.** AEGIS Urban centraliza lecturas de sensores urbanos (inundación, incendio, viento, calidad del aire) y las convierte en alertas, planes de evacuación y avisos para la ciudadanía, con permisos por rol y una bitácora cuya integridad se puede verificar.

**Para quién.** Personal de operación y tránsito, Defensa Civil, auditoría y administración, y la ciudadanía a través de una vista pública sin cuenta.

**Qué resuelve.** La información de riesgos suele estar repartida entre sistemas y personas. El prototipo ofrece una vista común, deja rastro inalterable de las acciones, permite ensayar respuestas con sensores simulados y avisa a cada persona si está dentro o cerca de una zona de riesgo. Cada dato se rotula **REAL** (clima de Open-Meteo) o **SIMULADO** (sensores de demostración).

**Stack.** Node.js + TypeScript + Express (API REST y socket.io), React 18 + Vite + TypeScript (interfaz), PostgreSQL 16 (datos), Docker (base de datos local), GitHub Actions (integración continua).

**Estado.** Prototipo funcional con 256 pruebas automatizadas aprobadas: 133 unitarias de backend, 18 de frontend, 99 de integración, seguridad y autorización por rol contra la API y PostgreSQL reales, y 6 de punta a punta con un navegador real. Compilación de backend y frontend aprobada. Pendientes: la sesión de aceptación con usuarios (el guion y el acta están en la sección 5.3) y la primera ejecución del job de CI «en vivo» en GitHub.

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
| 3 — Implementación y testing | Construcción por módulos, pruebas, operación de BD | Código, migraciones 001–018, 256 pruebas, script de carga, CI y respaldos | Pruebas automatizadas aprobadas y compilación limpia |
| 4 — Release y mantenimiento | Versión, aceptación, reversión, manuales y cierre | Notas v1.0.0, manuales, plan de mantenimiento y anexos | Checklist de pre-release y brechas declaradas |

---

---

[← Portada e índice](00-portada.md) · [Índice](00-portada.md#índice-general) · [Etapa 1 — Análisis y factibilidad →](02-etapa-1-analisis.md)
