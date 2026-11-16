-- Verificación de perfil por códigos (email y celular).
-- En esta versión el envío es SIMULADO: no se manda ningún email ni SMS real (ver VERIFICACION_SIMULADA).
-- El perfil queda verificado (users.verified_at) cuando se confirman AMBOS códigos.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at       TIMESTAMPTZ;

-- Solo se guarda el HMAC del código, nunca el código en claro.
CREATE TABLE IF NOT EXISTS verification_code (
    id_code      SERIAL       PRIMARY KEY,
    id_user      INTEGER      NOT NULL REFERENCES users(id_user) ON DELETE CASCADE,
    channel      VARCHAR(10)  NOT NULL CHECK (channel IN ('EMAIL','PHONE')),
    code_hash    CHAR(64)     NOT NULL,
    attempts     INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ  NOT NULL,
    consumed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_verification_code_user ON verification_code (id_user, channel, created_at DESC);

INSERT INTO patent (code, description, resource, http_method) VALUES
    ('CITIZEN_VERIFY_STATUS', 'Consultar el estado de verificación del perfil', '/api/auth/verificacion',           'GET'),
    ('CITIZEN_VERIFY_RESEND', 'Pedir un código de verificación nuevo',          '/api/auth/verificacion/reenviar',  'POST'),
    ('CITIZEN_VERIFY',        'Confirmar un código de verificación',            '/api/auth/verificacion/confirmar', 'POST')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description,
    resource = EXCLUDED.resource, http_method = EXCLUDED.http_method;

INSERT INTO family_patent (id_family, id_patent)
SELECT f.id_family, p.id_patent
FROM family f
CROSS JOIN patent p
WHERE f.name IN ('CIUDADANO', 'ADMIN_SISTEMA')
  AND p.code IN ('CITIZEN_VERIFY_STATUS', 'CITIZEN_VERIFY_RESEND', 'CITIZEN_VERIFY')
ON CONFLICT DO NOTHING;
