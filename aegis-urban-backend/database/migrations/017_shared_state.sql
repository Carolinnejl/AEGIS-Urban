-- 017: estado compartido entre instancias de la API (limitador de tasa y caché).
-- Antes vivían en la memoria de cada proceso; con varias instancias detrás de un balanceador
-- cada una contaba por su cuenta y el límite real se multiplicaba.
CREATE TABLE IF NOT EXISTS rate_limit (
    clave      VARCHAR(200) PRIMARY KEY,
    intentos   INTEGER      NOT NULL,
    reinicia   TIMESTAMPTZ  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_reinicia ON rate_limit (reinicia);

CREATE TABLE IF NOT EXISTS shared_cache (
    clave      VARCHAR(200) PRIMARY KEY,
    valor      JSONB,
    expira     TIMESTAMPTZ  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shared_cache_expira ON shared_cache (expira);
