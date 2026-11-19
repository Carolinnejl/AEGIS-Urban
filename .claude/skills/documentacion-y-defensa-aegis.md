---
name: documentacion-y-defensa-aegis
description: Estándar del documento funcional único de AEGIS Urban y checklist de defensa para Prácticas Profesionalizantes. Usar al editar la documentación, regenerar el PDF o preparar la defensa.
---

# Documentación y defensa de AEGIS Urban

## Estándar: un solo documento maestro

- Entregable final: `docs/pdf/AEGIS-Urban-Documento-Funcional-Unificado.pdf`.
- Fuente: `docs/unificado/maestro.md`. Las líneas `@@include archivo | sección | desplazamiento | skipTitle` traen secciones de los Markdown de `docs/` (que siguen siendo la fuente de verdad: arquitectura, análisis y diseño, especificación, manual, pruebas, base de datos, anexos).
- Generar (todo desde el maestro): `node docs/unificado/generar-markdown.cjs` (documento único en Markdown y páginas con flechas en `docs/documento/`, para leer en GitHub) y `node docs/unificado/generar-pdf.cjs` (PDF; necesita Chrome o Edge e internet). Volver a generar y commitear ambos cada vez que cambie un `.md` incluido. El README termina con la flecha «Siguiente → Documento funcional».
- Estructura obligatoria: portada (ficha técnica, 5 integrantes, distribución del trabajo, índice general) → 1 Introducción y resumen ejecutivo → 2 Etapa 1 Análisis y factibilidad → 3 Etapa 2 Diseño y arquitectura → 4 Etapa 3 Implementación y testing → 5 Etapa 4 Release, mantenimiento y cierre. Cada etapa cierra con una **Revisión SQA**.
- Formato: tablas con encabezado oscuro, bloques de código oscuros, saltos de página por etapa, numeración «Página X de Y».
- Curso: 6°3.

## Regla de oro: solo lo que está en el código

Todo lo que el documento afirme debe poder señalarse en un archivo o comando. Si algo se planificó y no se hizo, va en la tabla «Planificado y no realizado» (sección 5.1), nunca como hecho. Antes de afirmar un número, ejecutarlo: `npm test` (backend y frontend), `npm run test:live` y `npm run test:perf`.

Brechas declaradas hoy: sin Swagger, k6/pgbench ni despliegue en Render/Vercel; UC-16, UC-19 y UC-20 sin implementar; cifrado AES solo aplicado al teléfono; SMS simulado; simulaciones activas en temporizadores del proceso; job de CI «en vivo» aún sin ejecutar en GitHub; sesión de aceptación con usuarios por realizar (guion y acta en la sección 5.3). Cronograma: 14/09/2026 – 20/11/2026.

## Checklist de defensa

1. **Levantar** con `arrancar.bat` y entrar con un usuario del seed de desarrollo (no usar contraseñas reales en pantalla).
2. **Demo en orden:** vista ciudadana (REAL vs SIMULADO, alerta por ubicación en modo prueba) → login operativo → alerta: reconocer → iniciar evacuación (plan centrado en el sensor) → simulación → Administración: bitácora y «Verificar integridad» → Respaldos: crear y simulacro → cambio de idioma ES/EN → `/ayuda`.
3. **Patrones** (señalar el archivo): Singleton `config/database.ts` y `core/events/EventBus.ts`; Factory `core/factory/SensorFactory.ts`; Observer `EventBus` + handlers; Strategy `core/strategies`; Composite `core/composite/patent-family`.
4. **Seguridad:** bcrypt, HMAC, AES (`security/encryption`), JWT con revocación, patentes y familias (`PermissionGuard`), botones por patente, DVH/DVV (`integrity`), triggers de la migración 016.
5. **Base de datos:** respaldo con SHA-256, simulacro, restauración transaccional, particiones trimestrales (migración 015).
6. **Pruebas:** mostrar 133 + 18 + 99 + 6 E2E aprobadas y la tabla de percentiles de `test:perf`; explicar el bug real que encontraron (JWT duplicado → 500).
7. **Preguntas probables:** ¿qué pasa si un superusuario altera la bitácora? (DVH/DVV lo detecta, no lo impide); ¿por qué el SMS es simulado? (sin proveedor contratado); ¿cómo escala? (sección de escalabilidad: estado en memoria a mover a Redis); ¿qué falta? (las brechas de arriba).
8. **Cada integrante** debe poder explicar su rol y un módulo propio de la tabla «Distribución del trabajo».
