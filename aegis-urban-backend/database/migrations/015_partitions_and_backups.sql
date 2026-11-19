-- Mantenimiento de particiones de sensor_reading + permisos de respaldo y restauración.
--
-- Antes solo existían las particiones 2026 Q2–Q4 y ninguna se creaba sola: a partir del
-- 01/01/2027 cualquier lectura de sensor habría fallado ("no partition found").
-- Esta función crea, si faltan, las particiones de los próximos N trimestres.
CREATE OR REPLACE FUNCTION asegurar_particiones_sensor_reading(p_trimestres INTEGER DEFAULT 4)
RETURNS INTEGER AS $$
DECLARE
    tz      CONSTANT TEXT := 'America/Argentina/Buenos_Aires';
    inicio  DATE;
    fin     DATE;
    nombre  TEXT;
    creadas INTEGER := 0;
    i       INTEGER;
BEGIN
    FOR i IN 0 .. p_trimestres - 1 LOOP
        inicio := (date_trunc('quarter', now() AT TIME ZONE tz) + (i * INTERVAL '3 months'))::DATE;
        fin    := (inicio + INTERVAL '3 months')::DATE;
        nombre := format('sensor_reading_%s_q%s', EXTRACT(YEAR FROM inicio)::INT, EXTRACT(QUARTER FROM inicio)::INT);

        IF to_regclass(nombre) IS NULL THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF sensor_reading FOR VALUES FROM (%L) TO (%L)',
                nombre,
                make_timestamptz(EXTRACT(YEAR FROM inicio)::INT, EXTRACT(MONTH FROM inicio)::INT, 1, 0, 0, 0, tz),
                make_timestamptz(EXTRACT(YEAR FROM fin)::INT,    EXTRACT(MONTH FROM fin)::INT,    1, 0, 0, 0, tz));
            EXECUTE format('CREATE INDEX %I ON %I (id_sensor, recorded_at DESC)', 'idx_sr_sensor_date_' || nombre, nombre);
            creadas := creadas + 1;
        END IF;
    END LOOP;
    RETURN creadas;
END;
$$ LANGUAGE plpgsql;

-- Deja listas las particiones de los próximos 6 trimestres.
SELECT asegurar_particiones_sensor_reading(6);

INSERT INTO patent (code, description, resource, http_method) VALUES
    ('BACKUP_VIEW',    'Listar los respaldos de la base de datos',                  '/api/admin/backups',                      'GET'),
    ('BACKUP_CREATE',  'Crear un respaldo de la base de datos',                     '/api/admin/backups',                      'POST'),
    ('BACKUP_DRILL',   'Simulacro: restaurar un respaldo en una base temporal',     '/api/admin/backups/:archivo/simulacro',   'POST'),
    ('BACKUP_RESTORE', 'Restaurar un respaldo sobre la base de datos en uso',       '/api/admin/backups/:archivo/restaurar',   'POST')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description,
    resource = EXCLUDED.resource, http_method = EXCLUDED.http_method;

INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent
FROM family f
CROSS JOIN patent p
WHERE f.name = 'ADMIN_SISTEMA'
  AND p.code IN ('BACKUP_VIEW', 'BACKUP_CREATE', 'BACKUP_DRILL', 'BACKUP_RESTORE')
ON CONFLICT DO NOTHING;
