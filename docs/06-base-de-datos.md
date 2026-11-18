# AEGIS Urban — Operación de la base de datos

PostgreSQL 16. El esquema se versiona en `aegis-urban-backend/database/migrations/` (001–016); una migración aplicada no se edita.

## Respaldo y restauración

| Aspecto | Cómo funciona |
|---|---|
| Formato | `pg_dump` comprimido con gzip + manifiesto con SHA-256 |
| Modo | `BACKUP_MODO=docker` (usa `docker exec` en el contenedor `aegis_postgres`) o `local` (usa `pg_dump`/`psql` del equipo) |
| Automático | Un respaldo cada 24 h (`BACKUP_AUTOMATICO`), conserva los últimos `BACKUP_RETENCION` (7) |
| Simulacro | Restaura en una base temporal, verifica DVH/DVV y la elimina. No toca la base en uso |
| Restauración | Exige confirmación escrita, verifica el SHA-256, crea antes un respaldo de seguridad y restaura en **una sola transacción** (`-1`): si falla, no queda a medias |
| API | `GET/POST /api/admin/backups`, `POST /api/admin/backups/:archivo/simulacro`, `POST …/restaurar` (solo ADMIN_SISTEMA); el nombre de archivo se valida contra recorrido de directorios |

## Particiones

`sensor_reading` es una tabla particionada por rango (un trimestre por partición). La migración 015 agregó la función `asegurar_particiones_sensor_reading(n)`, que crea las que falten; corre al arrancar y cada 6 horas. Antes, la última partición cubría hasta 31/12/2026 y las lecturas fallaban desde el 01/01/2027.

## Verificación de integridad

- **DVH** (dígito verificador horizontal): hash de cada fila de `audit_log`. **DVV** (vertical): cadena que encadena cada fila con la anterior. Ver [fundamento matemático](01-arquitectura.md).
- `GET /api/admin/integridad` las recalcula; el simulacro de restauración también.
- **Inmutabilidad** (migración 016): triggers que rechazan `UPDATE`, `DELETE` y `TRUNCATE` sobre `audit_log`. Un `REVOKE` no alcanza porque el usuario de la aplicación es superusuario del contenedor de desarrollo. Un superusuario aún podría desactivar el trigger; por eso DVH/DVV sigue siendo la segunda defensa, que detecta la alteración.

## Cifrado

| Tipo | Uso | Técnica |
|---|---|---|
| Irreversible | Contraseñas | bcrypt, factor 12 |
| Irreversible | Códigos de verificación | HMAC |
| Reversible | Teléfono (columnas de nombre y DNI previstas, hoy sin uso) | AES-256-CBC (`AES_SECRET_KEY`) |

## Migraciones

Orden: 001 → 016, luego `seeds/001` y `seeds/002`. `arrancar.bat` las aplica sobre el contenedor; el CI las aplica sobre un PostgreSQL de servicio.
