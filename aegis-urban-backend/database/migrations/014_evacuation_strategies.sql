-- Las estrategias de evacuación que usa el código (Strategy) son ZONAL, MASIVA y REFUGIO_IN_SITU,
-- pero la restricción original de la tabla solo aceptaba SHORTEST, SAFEST y CAPACITY:
-- todo INSERT de un plan fallaba. Se amplía la restricción (se conservan los valores anteriores).
ALTER TABLE evacuation_plan DROP CONSTRAINT IF EXISTS evacuation_plan_strategy_used_check;
ALTER TABLE evacuation_plan ADD CONSTRAINT evacuation_plan_strategy_used_check
  CHECK (strategy_used IN ('ZONAL', 'MASIVA', 'REFUGIO_IN_SITU', 'SHORTEST', 'SAFEST', 'CAPACITY'));
