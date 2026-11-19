-- Usuarios de DESARROLLO, uno por familia, para probar los permisos de cada rol.
-- Contraseña de todos: Aegis2026!  (bcrypt, factor 12). Cambiar o eliminar antes de cualquier uso real.
INSERT INTO users (username, email, password_hash, id_family, is_active)
SELECT v.username, v.email, '$2b$12$bO./2mn4pZ/y7Y8YyyPaXORPyiV9yDuFU3iHaMZJMHyvyfKpQCjTG', f.id_family, TRUE
FROM (VALUES
    ('transito', 'transito@aegis.urban', 'TRANSITO'),
    ('defensa',  'defensa@aegis.urban',  'DEFENSA_CIVIL'),
    ('auditor',  'auditor@aegis.urban',  'AUDITOR')
) AS v(username, email, familia)
JOIN family f ON f.name = v.familia
ON CONFLICT (username) DO NOTHING;
