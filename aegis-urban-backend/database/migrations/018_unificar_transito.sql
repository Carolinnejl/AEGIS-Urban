-- 018: TRANSITO absorbe a OPERADOR_CRISIS.
-- Las dos familias tenían exactamente las mismas patentes (TRANSITO no sumaba ninguna propia),
-- así que eran un solo rol con dos nombres. Queda TRANSITO como familia base de la operación
-- y DEFENSA_CIVIL hereda de ella (las patentes de lectura siguen heredándose).
DO $$
DECLARE
    v_transito INTEGER;
    v_operador INTEGER;
BEGIN
    SELECT id_family INTO v_transito FROM family WHERE name = 'TRANSITO';
    SELECT id_family INTO v_operador FROM family WHERE name = 'OPERADOR_CRISIS';
    IF v_transito IS NULL OR v_operador IS NULL THEN RETURN; END IF;  -- ya unificado: no hace nada

    INSERT INTO family_patent (id_family, id_patent)
    SELECT v_transito, id_patent FROM family_patent WHERE id_family = v_operador
    ON CONFLICT DO NOTHING;

    UPDATE users  SET id_family = v_transito WHERE id_family = v_operador;
    UPDATE family SET id_parent_family = NULL,
                      description = 'Operación: panel, mapa, sensores y alertas (lectura)'
                  WHERE id_family = v_transito;
    UPDATE family SET id_parent_family = v_transito WHERE name = 'DEFENSA_CIVIL';

    DELETE FROM family_patent WHERE id_family = v_operador;  -- (el CASCADE lo haría igual)
    DELETE FROM family WHERE id_family = v_operador;
END $$;
