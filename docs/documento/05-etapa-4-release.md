<!-- Archivo generado por docs/unificado/generar-markdown.cjs. No editar: cambiar el maestro o las fuentes y regenerar. -->
[← Etapa 3 — Implementación y testing](04-etapa-3-implementacion.md) · [Índice](00-portada.md#índice-general) · [Volver al README →](../../README.md)

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
| 99 pruebas en vivo (integración, seguridad y 58 de autorización por rol) | Aprobadas |
| 6 pruebas de punta a punta con navegador (Playwright) | Aprobadas |
| Migraciones 001–017 aplicadas en la base local | Aprobado |
| Respaldo con restauración verificada (simulacro) | Disponible |
| Secretos fuera del código y validados al arrancar | Aprobado |
| Datos simulados rotulados | Aprobado |
| Job de CI con PostgreSQL de servicio | Definido; pendiente de primera ejecución |
| Revisión legal de los textos por un profesional | Pendiente |
| Pruebas de aceptación con usuarios | Pendiente |

## 5.3 Pruebas de aceptación (UAT)


| Escenario | Rol | Criterio de aceptación | Resultado |
|---|---|---|---|
| Consultar y filtrar alertas por zona y período | Tránsito | Resultados respetan filtros y paginación; no habilitan acciones de respuesta | Pendiente |
| Reconocer, iniciar plan y resolver una alerta | Defensa Civil | Cada transición muestra el estado correcto y queda en bitácora | Pendiente |
| Crear ejercicio con sensores simulados y detenerlo | Defensa Civil | Sólo afecta sensores simulados; registra configuración y eventos | Pendiente de probar con migración aplicada |
| Revisar la bitácora | Auditoría | Puede consultar y verificar integridad, sin modificar el estado de alertas | Pendiente |
| Ver clima y avisos sin cuenta | Ciudadano | Muestra clima real y avisos con su origen (REAL/SIMULADO), sin pedir datos | Implementado; pendiente con usuarios |
| Registrarse aceptando términos, privacidad y edad | Ciudadano | El registro se rechaza si falta alguno; la ubicación es opcional; queda la evidencia | Verificado por API |
| Estar dentro de una zona de peligro | Ciudadano | Cartel con dirección para alejarse; precaución cerca del borde | Verificado en modo prueba; GPS real pendiente |
| Verificar el perfil con los códigos de email y celular | Ciudadano | Con ambos códigos correctos el perfil queda verificado; un código vencido, incorrecto o agotado se rechaza | Probado en pruebas unitarias; envío simulado |
| Revocar la ubicación, descargar datos y darse de baja | Ciudadano | Los datos se exportan y la baja anonimiza la cuenta | Verificado por API |
| Consultar un aviso oficial de un organismo | Ciudadano | Requiere un conector oficial (CAP) | Fuera del prototipo |


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


Con el selector **ES / EN** de la esquina superior cambia todo el texto de la interfaz. La elección se recuerda en ese navegador.

### Ciudadanía

1. En la pantalla de ingreso, abrí **«Ver como ciudadano»**: no hace falta cuenta.
2. Mirá el **clima actual** y los **avisos**. Cada aviso dice si es **REAL** (clima de Open-Meteo) o **SIMULADO** (sensores de demostración).
3. Si querés alertas por ubicación, tocá **«Permitir ubicación»**. Tu posición se usa solo para calcular la distancia a las zonas de riesgo y no se guarda. Podés revocarlo cuando quieras.
4. Si estás dentro de una zona de peligro vas a ver un **cartel rojo** que indica hacia dónde alejarte. El **modo prueba** simula tu posición para ver el cartel sin moverte.
5. **Crear cuenta:** completá los datos, aceptá los términos y verificá tu correo y tu celular con los códigos de 6 dígitos. En esta versión el SMS es simulado: el código aparece en pantalla.
6. **Mis datos:** *Descargar mis datos* (Ley 25.326) y *Dar de baja mi cuenta*.

### Operación y tránsito

1. Ingresá con tu usuario y contraseña.
2. En el **Panel** mirá el resumen de sensores y alertas.
3. En el **Mapa** ubicá los sensores por zona.
4. En **Alertas** filtrá por severidad, zona, estado o fecha.

### Defensa Civil

1. **Reconocé** la alerta antes de iniciar una evacuación.
2. **Iniciá la evacuación:** el sistema elige la estrategia (zonal, masiva o refugio en el lugar) según la severidad y el tipo, y centra el plan en la ubicación real del sensor. El plan muestra radio afectado, personas estimadas (con una densidad de referencia, no datos del censo), puntos de reunión e instrucciones.
3. En **Simulación** creá ejercicios con sensores simulados, intensidad y duración, y detenelos cuando quieras.
4. **Resolvé** la alerta cuando termina la emergencia.

### Auditoría

1. **Administración → Bitácora** muestra las acciones registradas.
2. **Verificar integridad** recalcula DVH (huella por fila) y DVV (cadena entre filas). Si alguien alteró la bitácora, indica la fila.
3. El acceso es de solo lectura: no se puede cambiar el estado de las alertas.

### Administración

1. **Usuarios y Familias:** revisá quién tiene acceso y con qué rol.
2. **Respaldos:** *Crear respaldo ahora*; hacé el **simulacro de restauración** con regularidad (restaura en una base temporal y verifica la integridad sin tocar la base en uso).
3. **Restaurar** reemplaza los datos actuales: pide una confirmación escrita y antes crea un respaldo de seguridad.
4. Cada 24 h se crea un respaldo automático y se conservan los últimos 7. Detalle técnico: operación de la base de datos.

### Problemas frecuentes

| Problema | Qué hacer |
|---|---|
| No llegó el código | Revisá spam y esperá 30 s para pedir otro. Cada código vence a los 10 minutos y permite 5 intentos |
| «Demasiados intentos de inicio de sesión» | Esperá 15 minutos (límite de 10 intentos) |
| No veo un botón | Tu familia no tiene esa patente; pedíselo a un administrador |


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


- Revisar disponibilidad de API, base, WebSocket y retraso de telemetría.
- Aplicar migraciones versionadas y conservar evidencia de resultado.
- Verificar respaldo, restauración, espacio de particiones y bitácora.
- Revisar permisos por familia y revocar accesos innecesarios.
- Para operar ejercicios de forma continua, reemplazar temporizadores en memoria por un worker persistente con recuperación y exclusión entre instancias.
- Antes de alertas públicas, probar actualización, cancelación, expiración y falla de cada fuente externa.


## 5.7 Anexos

### Anexo A — Decisiones de producto


AEGIS debería combinar consulta pública y control operativo por roles. Una persona debe poder ver avisos públicos sin crear una cuenta; suscribirse a notificaciones por área o amenaza debería ser opcional. Los roles siguen controlando quién reconoce, escala, configura o cierra incidentes. Los roles y las notificaciones responden preguntas distintas.

| Clase de información | Qué debe mostrar | Quién la modifica |
|---|---|---|
| Aviso oficial | Organismo emisor, hora, vigencia, zona, severidad, estado y fuente original | Adaptador de una fuente autorizada; cambios de operación bajo permisos institucionales |
| Observación de sensor | Ubicación, lectura, hora y etiqueta de dato automático no confirmado | Sistema de telemetría y personal operativo autorizado |
| Ejercicio simulado | Marca persistente de simulación, sensores y duración | Familias habilitadas para ejercicios |

Conviene priorizar APIs oficiales que publiquen Common Alerting Protocol (CAP), conservando emisor, severidad, certeza, área, vigencia, actualizaciones y cancelaciones. Si la fuente no ofrece CAP, un adaptador específico debe normalizar sus datos sin borrar el origen. Referencias: [OASIS CAP v1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html), [sistema de alerta temprana de UNDRR](https://www.undrr.org/terminology/early-warning-system) y [SINAGIR](https://www.argentina.gob.ar/sinagir).

**Estado:** existe una vista pública (`/ciudadano`) que combina el clima real de Open-Meteo con avisos de sensores simulados, siempre etiquetados. Todavía no hay un conector de APIs oficiales (CAP). Los datos del prototipo no deben confundirse con instrucciones oficiales.


### Anexo B — Contratos de API


#### Alertas

`GET /api/alertas?page=1&pageSize=20&zonaId=3&desde=2026-10-01&hasta=2026-10-28&estado=ACTIVE&nivel=CRITICAL&busqueda=lluvia`

`pageSize` admite de 1 a 100. `zonaId` filtra también sus descendientes. La respuesta contiene `alertas` y `paginacion` (`page`, `pageSize`, `total`, `totalPages`). Las opciones geográficas se consultan en `GET /api/alertas/zonas`.

#### Públicos y de cuenta ciudadana

Los endpoints `/api/publico/*` no requieren sesión, limitan a 60 solicitudes por minuto por IP y no exponen usuarios ni bitácora.

| Método y ruta | Descripción |
|---|---|
| `GET /api/publico/clima?lat&lon` | Clima y calidad del aire (Open-Meteo, caché de 10 min). Sin coordenadas usa Buenos Aires |
| `GET /api/publico/avisos?lat&lon` | Avisos reales del clima más avisos simulados de las últimas 6 horas |
| `GET /api/publico/zonas` | Zonas de riesgo vigentes con centro, radio y severidad |
| `POST /api/publico/riesgo` | Recibe `{lat, lon}` en el cuerpo y devuelve `SEGURO`, `PRECAUCION` o `PELIGRO` con zona, distancia y dirección. Es POST para que la ubicación exacta no quede en los logs |
| `GET /api/auth/legal` | Versiones vigentes de los textos legales |
| `POST /api/auth/registro` | Alta de ciudadano. Exige `telefono`, `aceptaTerminos`, `aceptaPrivacidad`, `declaraEdad` y las versiones leídas; `aceptaUbicacion` es opcional |
| `GET /api/auth/verificacion` | Estado de la verificación (email, celular y perfil) con los datos enmascarados |
| `POST /api/auth/verificacion/reenviar` | Pide un código nuevo para `{canal}` (`EMAIL` o `PHONE`). Espera de 30 s entre códigos y máximo 5 por hora. Solo para un canal simulado la respuesta incluye `codigoSimulado`; un correo real nunca devuelve el código. Si el envío real falla responde 502 |
| `POST /api/auth/verificacion/confirmar` | Confirma `{canal, codigo}`. Responde 400 si es incorrecto, 410 si venció y 429 si se agotaron los 5 intentos |
| `PUT /api/auth/consentimiento-ubicacion` | Otorga o revoca el permiso de ubicación (`{acepta}`) |
| `GET /api/auth/mis-datos` | Derecho de acceso: perfil e historial de consentimientos |
| `DELETE /api/auth/mis-datos` | Derecho de supresión: baja y anonimización de la cuenta |

#### Escenarios

- `GET /api/simulation/scenarios`: devuelve los últimos 100 ejercicios.
- `POST /api/simulation/scenarios`: recibe `name`, `sensorIds`, `intensidad` (`NORMAL`, `WARNING`, `CRITICAL`), `intervaloSegundos` (5–300) y `duracionMinutos` (1–240).
- `POST /api/simulation/scenarios/:id/iniciar`: inicia un ejercicio en borrador.
- `DELETE /api/simulation/scenarios/:id`: detiene un ejercicio activo.

Sólo se aceptan sensores marcados como simulados. El scheduler actual opera en memoria del proceso Node y no está preparado para múltiples instancias ni recuperación automática después de una caída abrupta.


### Anexo C — Glosario


| Término | Significado |
|---|---|
| Telemetría | Lectura con valor, unidad, sensor y hora |
| Sensor simulado | Fuente sintética usada para un ejercicio |
| Reconocer | Confirmar recepción de una alerta, sin resolverla |
| Plan de evacuación | Cálculo que requiere revisión humana; no es instrucción oficial |
| CAP | Formato interoperable para intercambio de alertas públicas |
| DVH | Huella criptográfica de una fila de bitácora |
| DVV | Huella encadenada que ayuda a detectar alteraciones en la secuencia |
| Familia / patente | Agrupación de roles y permiso atómico del modelo de autorización |
| Zona de riesgo | Círculo (centro y radio) derivado de una alerta vigente; el radio depende de la severidad |
| Consentimiento | Aceptación expresa, versionada y registrada de un texto legal o del uso de la ubicación |
| AAIP | Agencia de Acceso a la Información Pública, autoridad de control de la Ley 25.326 |


### Anexo D — Backlog priorizado


| Prioridad | Trabajo pendiente | Criterio de cierre |
|---|---|---|
| P0 | Revisión legal de Términos, Privacidad y consentimiento de ubicación | Un profesional valida los textos antes de un uso con público real |
| P0 | Verificar las migraciones 010–012 en cada base existente | Los filtros, escenarios, rol ciudadano y consentimientos operan contra la base |
| P0 | Pruebas de integración de rol/ruta con PostgreSQL | Matriz permitida/denegada verificada para cada familia y operación sensible |
| P0 | Validar cálculos de rutas, población y protocolos | Aprobación de responsables técnicos y organismos competentes antes de uso operativo |
| P1 | Suscripción por zona y avisos con la app cerrada (PWA) | Notificaciones push probadas en dispositivos móviles |
| P1 | Dominio propio verificado para el correo (Resend solo entrega al dueño de la cuenta sin dominio) y envío real de SMS con un proveedor | Los códigos llegan a cualquier persona; un canal SMS nuevo en `canales-verificacion.ts` con pruebas de entrega |
| P1 | Catastro de refugios y rutas por calles para la evacuación | Los puntos de encuentro y los recorridos salen de datos reales y no de distritos cercanos |
| P1 | Zonas de riesgo como polígonos en lugar de círculos | Cálculo con geometría real de cada zona |
| P1 | Integración con una API oficial de la ciudad/organismo | Adaptador, actualización, cancelación, expiración y manejo de fallas probados |
| P1 | Filtros de mapa y paginación de bitácora | Consulta útil con volumen de datos representativo y permisos revisados |
| P1 | Scheduler persistente de ejercicios | Recuperación tras reinicio y coordinación segura entre instancias |
| P2 | Pruebas de accesibilidad y aceptación ciudadana | Flujos críticos revisados con usuarios, teclado y dispositivos móviles |


### Anexo E — Marco legal (Ley 25.326)


El texto completo está en la aplicación: [Términos y Condiciones](../../aegis-urban-frontend/src/legal/textos.ts) y Política de Privacidad (rutas `/terminos` y `/privacidad`). Son un texto base del prototipo y **requieren revisión de un profesional** antes de un uso real.

| Principio (Ley 25.326 y Decreto 1558/2001) | Cómo se aplica |
|---|---|
| Consentimiento libre, expreso e informado (art. 5) | Casillas sin marcar de antemano; los textos se leen antes de aceptar; la ubicación se pide aparte |
| Calidad y minimización de datos (art. 4) | Solo usuario, correo, celular (cifrado AES-256) y contraseña; sin DNI ni nombre real |
| Seguridad de los datos (art. 9) | Contraseñas con BCrypt, sesiones revocables, control de acceso por rol y bitácora íntegra |
| Derecho de acceso (art. 14) | `GET /api/auth/mis-datos` y botón «Descargar mis datos» |
| Rectificación y supresión (art. 16) | `DELETE /api/auth/mis-datos`: la cuenta se desactiva y se anonimiza |
| Control | Reclamos ante la AAIP (www.argentina.gob.ar/aaip), indicada en la Política de Privacidad |

**Evidencia.** Cada consentimiento se guarda en `user_consent` con tipo (`TERMS`, `PRIVACY`, `AGE`, `LOCATION`), versión del texto, si fue otorgado, fecha e IP. Al cambiar un texto se sube su versión (`backend/src/config/legal.ts` y `frontend/src/legal/textos.ts`) y el servidor rechaza registros hechos con una versión vieja. Aceptar los textos registra `terms_verified_at`; el perfil queda verificado (`verified_at`) cuando se confirman los códigos de email y celular.

**Ubicación.** Las coordenadas exactas viajan por POST, se usan para un único cálculo y no se guardan ni se asocian a la cuenta. Para el clima se envía una posición aproximada (~1 km) a Open-Meteo. El permiso se puede revocar desde la aplicación.

**Verificación de perfil.** Se pide el celular al registrarse y se guarda cifrado (AES-256). El perfil se verifica con un código de 6 dígitos para el correo y otro para el celular. Solo se guarda el HMAC del código (atado al usuario y al canal), que vence a los 10 minutos y se invalida tras 5 intentos fallidos. **El correo se envía de verdad por SMTP** (proveedor Resend; el código nunca se muestra en pantalla ni se escribe en los logs) y **el SMS es simulado**: no sale ningún SMS real y el código se muestra en pantalla. La Política de Privacidad declara ambos hechos y al proveedor de correo. Los derechos de acceso y supresión no dependen de estar verificado.




## 5.8 Cierre y trabajo futuro

AEGIS Urban cumple, como prototipo, el ciclo de vida completo: se analizó el problema, se diseñó y modeló, se construyó con los patrones exigidos, se probó de forma automatizada y se dejó documentado. No está conectado a fuentes oficiales y no debe presentarse como canal de instrucciones de emergencia.

**Prioridades siguientes:** envío real de SMS; catastro de refugios y rutas por calles; revisión legal de los textos; integrar una fuente oficial por CAP; suscripciones por zona y avisos con la aplicación cerrada (PWA); realizar la sesión de aceptación con usuarios; pasar limitador y caché a Redis si el tráfico lo exige; y un worker persistente para las simulaciones activas al escalar a varias instancias.

**Revisión SQA de la etapa 4:** brechas respecto del plan original declaradas (sección 5.1); checklist de pre-release con estado verdadero; manuales por perfil; plan de reversión apoyado en el simulacro de restauración.

---

[← Etapa 3 — Implementación y testing](04-etapa-3-implementacion.md) · [Índice](00-portada.md#índice-general) · [Volver al README →](../../README.md)
