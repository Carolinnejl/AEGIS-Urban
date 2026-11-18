-- La bitácora debe ser inmutable. El REVOKE UPDATE/DELETE de la migración 004 NO alcanza:
-- el usuario de la aplicación es superusuario de PostgreSQL y un superusuario ignora los permisos.
-- Estos disparadores rechazan UPDATE, DELETE y TRUNCATE para cualquier rol. Las restauraciones
-- (DROP TABLE + COPY) no los activan, porque no son UPDATE/DELETE de filas.
CREATE OR REPLACE FUNCTION audit_log_inmutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log es inmutable: no se permite % sobre la bitácora', TG_OP
        USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_inmutable ON audit_log;
CREATE TRIGGER trg_audit_log_inmutable
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_inmutable();

DROP TRIGGER IF EXISTS trg_audit_log_sin_truncate ON audit_log;
CREATE TRIGGER trg_audit_log_sin_truncate
    BEFORE TRUNCATE ON audit_log
    FOR EACH STATEMENT EXECUTE FUNCTION audit_log_inmutable();
