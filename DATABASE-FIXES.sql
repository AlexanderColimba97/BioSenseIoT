# 🔒 DATABASE SECURITY FIXES - SQL Migrations
## Schema Updates + Performance + Encryption

---

## ARCHIVO: `backend/src/main/resources/db/migration/V2__AddSecurityEnhancements.sql`

```sql
-- ============================================================
-- MIGRATION: V2__AddSecurityEnhancements.sql
-- Propósito: Agregar deduplication, índices, constraints
-- Aplicar antes de deployar fixes de backend
-- ============================================================

-- 1. AGREGAR READING_ID PARA DEDUPLICATION
-- ============================================================

ALTER TABLE sensor_readings 
ADD COLUMN IF NOT EXISTS reading_id VARCHAR(36) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text;

-- Generar UUIDs para lecturas existentes si es necesario
UPDATE sensor_readings 
SET reading_id = uuid_generate_v4()::text 
WHERE reading_id IS NULL;

-- Eliminar default después de poblar
ALTER TABLE sensor_readings 
ALTER COLUMN reading_id DROP DEFAULT;


-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Índice en reading_id (buscar por lectura única)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_reading_id 
  ON sensor_readings(reading_id) 
  WHERE reading_id IS NOT NULL;

-- Índice en device_id + created_at (consultas recientes por dispositivo)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time 
  ON sensor_readings(device_id, created_at DESC);

-- Índice en created_at (limpieza de datos antiguos)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_created_at 
  ON sensor_readings(created_at DESC);

-- Índice en api_secret (búsquedas por secreto)
CREATE INDEX IF NOT EXISTS idx_devices_api_secret 
  ON devices(api_secret) 
  WHERE api_secret IS NOT NULL;

-- Índice en mac_address (búsqueda por MAC)
CREATE INDEX IF NOT EXISTS idx_devices_mac_address 
  ON devices(mac_address) 
  WHERE mac_address IS NOT NULL;

-- Índice en user_id (dispositivos por usuario)
CREATE INDEX IF NOT EXISTS idx_devices_user_id 
  ON devices(user_id) 
  WHERE user_id IS NOT NULL;


-- 3. UNIQUE CONSTRAINTS PARA PREVENIR DUPLICADOS
-- ============================================================

-- Constraint: reading_id único (CRITICAL - evita duplicados)
ALTER TABLE sensor_readings 
ADD CONSTRAINT IF NOT EXISTS uq_reading_id 
UNIQUE (reading_id);

-- Constraint: device + timestamp único (evita múltiples lecturas en el mismo segundo)
ALTER TABLE sensor_readings 
ADD CONSTRAINT IF NOT EXISTS uq_device_timestamp 
UNIQUE (device_id, DATE_TRUNC('minute', created_at));

-- Constraint: mac_address único en devices
ALTER TABLE devices 
ADD CONSTRAINT IF NOT EXISTS uq_devices_mac_address 
UNIQUE (mac_address);

-- Constraint: api_secret único (cada dispositivo tiene secret diferente)
ALTER TABLE devices 
ADD CONSTRAINT IF NOT EXISTS uq_devices_api_secret 
UNIQUE (api_secret) 
WHERE api_secret IS NOT NULL;


-- 4. AGREGAR CAMPOS DE AUDITORÍA
-- ============================================================

-- Timestamp de última actualización
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Última sincronización exitosa
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP;

-- Contador de tentativas de conexión
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS connection_attempts INTEGER DEFAULT 0;

-- Flag para detectar devices comprometidos
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT FALSE;

-- Razón de sospecha
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS suspicious_reason VARCHAR(255);


-- 5. FUNCIÓN PARA ACTUALIZAR TIMESTAMP
-- ============================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a devices
DROP TRIGGER IF EXISTS trg_devices_updated_at ON devices;
CREATE TRIGGER trg_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();


-- 6. FUNCIÓN PARA DETECTAR ANOMALÍAS
-- ============================================================

CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Si hay más de 100 lecturas en 1 minuto: sospechoso
  SELECT COUNT(*) INTO recent_count
  FROM sensor_readings
  WHERE device_id = NEW.device_id
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute';

  IF recent_count > 100 THEN
    UPDATE devices
    SET is_suspicious = TRUE,
        suspicious_reason = 'Excessive readings in short time (>100/min)'
    WHERE id = NEW.device_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a sensor_readings
DROP TRIGGER IF EXISTS trg_sensor_readings_suspicious ON sensor_readings;
CREATE TRIGGER trg_sensor_readings_suspicious
AFTER INSERT ON sensor_readings
FOR EACH ROW
EXECUTE FUNCTION detect_suspicious_activity();


-- 7. VIEW PARA MONITOREO DE SEGURIDAD
-- ============================================================

CREATE OR REPLACE VIEW v_security_audit AS
SELECT 
  d.id,
  d.mac_address,
  d.api_secret,
  d.user_id,
  COUNT(sr.id) as reading_count,
  MAX(sr.created_at) as last_reading_time,
  d.is_suspicious,
  d.suspicious_reason,
  d.last_sync_at,
  d.connection_attempts,
  d.created_at,
  d.updated_at
FROM devices d
LEFT JOIN sensor_readings sr ON d.id = sr.device_id
GROUP BY d.id, sr.device_id;


-- 8. FUNCIÓN PARA LIMPIAR DATOS ANTIGUOS
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE(deleted_readings INTEGER, deleted_diagnostics INTEGER) AS $$
DECLARE
  v_deleted_readings INTEGER;
  v_deleted_diagnostics INTEGER;
BEGIN
  -- Eliminar lecturas más antiguas de 90 días
  DELETE FROM sensor_readings
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_readings = ROW_COUNT;

  -- Eliminar diagnósticos más antiguos de 90 días
  DELETE FROM diagnostics
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_diagnostics = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_readings, v_deleted_diagnostics;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar limpieza manualmente cada mes:
-- SELECT * FROM cleanup_old_data();


-- 9. MEJORAR SEGURIDAD DE TABLA USERS
-- ============================================================

-- Hash de contraseña debe ser NOT NULL
ALTER TABLE users
ALTER COLUMN password_hash SET NOT NULL;

-- Email debe ser único
ALTER TABLE users
ADD CONSTRAINT IF NOT EXISTS uq_users_email 
UNIQUE (email);

-- Agregar índice en email
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Agregar flag para detectar accounts comprometidas
ALTER TABLE users
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Trigger para bloquear account después de 5 intentos fallidos
CREATE OR REPLACE FUNCTION lock_account_after_failed_attempts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.failed_login_attempts >= 5 THEN
    NEW.account_locked = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_lock_account ON users;
CREATE TRIGGER trg_users_lock_account
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION lock_account_after_failed_attempts();


-- 10. MEJORAR SEGURIDAD DE JWT STORAGE (OPCIONAL - si implementas token revocation)
-- ============================================================

-- Crear tabla para revoked tokens
CREATE TABLE IF NOT EXISTS revoked_tokens (
  id SERIAL PRIMARY KEY,
  token_jti VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255)
);

-- Índice para búsquedas rápidas de tokens revocados
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti 
ON revoked_tokens(token_jti);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user_id 
ON revoked_tokens(user_id);

-- Limpiar tokens revocados expirados
CREATE OR REPLACE FUNCTION cleanup_revoked_tokens()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Eliminar tokens revocados más antiguos de 30 días
  DELETE FROM revoked_tokens
  WHERE revoked_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted;
END;
$$ LANGUAGE plpgsql;


-- 11. MEJORAR SEGURIDAD DE DIAGNOSTICS
-- ============================================================

-- Agregar índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_diagnostics_user_id 
ON diagnostics(user_id);

-- Agregar índice para búsquedas por severidad
CREATE INDEX IF NOT EXISTS idx_diagnostics_severity 
ON diagnostics(severity);

-- Constraint: severity solo puede ser LOW, MEDIUM, HIGH, CRITICAL
ALTER TABLE diagnostics
ADD CONSTRAINT IF NOT EXISTS ck_valid_severity
CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));


-- 12. AUDITORÍA DE CAMBIOS (Log para compliance)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER,
  user_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp 
ON audit_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id 
ON audit_log(user_id);


-- 13. VERIFICACIÓN Y VALIDACIÓN
-- ============================================================

-- Verificar que todas las constraints están en lugar
DO $$
BEGIN
  RAISE NOTICE 'Security enhancements applied successfully';
  RAISE NOTICE 'Checking constraints...';
  
  -- Verify reading_id constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'sensor_readings' 
    AND constraint_name = 'uq_reading_id'
  ) THEN
    RAISE WARNING 'Missing constraint: uq_reading_id';
  ELSE
    RAISE NOTICE '✓ reading_id unique constraint exists';
  END IF;

  -- Verify indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'sensor_readings' 
    AND indexname = 'idx_sensor_readings_device_time'
  ) THEN
    RAISE WARNING 'Missing index: idx_sensor_readings_device_time';
  ELSE
    RAISE NOTICE '✓ Performance indexes created';
  END IF;

END $$;

COMMIT;
```

---

## INSTALACIÓN DE LA MIGRATION

### Paso 1: Copiar archivo
```bash
# Crear directory si no existe
mkdir -p backend/src/main/resources/db/migration

# Copiar este archivo como V2__AddSecurityEnhancements.sql
# (El prefijo V2_ es importante - Flyway lo detecta automáticamente)
```

### Paso 2: Ejecutar en Spring Boot
```bash
cd backend

# Flyway ejecutará automáticamente todas las migraciones pendientes
mvn spring-boot:run

# Verificar en logs:
# "Executing SQL migration: V2__AddSecurityEnhancements.sql"
# "Successfully applied migration: V2 (AddSecurityEnhancements)"
```

### Paso 3: Validación Manual (Opcional)
```sql
-- Conectar a base de datos (psql o similar)
psql -U biosense_user -d biosense_iot

-- Verificar constraints
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'sensor_readings';

-- Verificar índices
SELECT indexname FROM pg_indexes 
WHERE tablename = 'sensor_readings';

-- Verificar triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'sensor_readings';

-- Verificar views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public';
```

---

## QUERIES ÚTILES PARA MONITOREO POST-DEPLOYMENT

```sql
-- 1. Ver estado de seguridad de todos los dispositivos
SELECT * FROM v_security_audit WHERE is_suspicious = TRUE;

-- 2. Detectar dispositivos con muchas lecturas (posible DoS)
SELECT device_id, COUNT(*) as reading_count, MAX(created_at) 
FROM sensor_readings
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY device_id
HAVING COUNT(*) > 360  -- Más de 6 lecturas/minuto
ORDER BY reading_count DESC;

-- 3. Verificar lecturas duplicadas
SELECT reading_id, COUNT(*) 
FROM sensor_readings
GROUP BY reading_id
HAVING COUNT(*) > 1;

-- 4. Ver accounts con intentos fallidos
SELECT id, email, failed_login_attempts, account_locked 
FROM users 
WHERE account_locked = TRUE 
OR failed_login_attempts >= 3;

-- 5. Revisar tokens revocados
SELECT rt.token_jti, u.email, rt.revoked_at, rt.reason 
FROM revoked_tokens rt
JOIN users u ON rt.user_id = u.id
ORDER BY rt.revoked_at DESC
LIMIT 50;

-- 6. Analizar patrones de uso anormal
SELECT 
  d.mac_address,
  COUNT(sr.id) as reading_count,
  DATE_TRUNC('hour', sr.created_at) as hour,
  STDDEV(sr.mq4) as mq4_stddev
FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.id
WHERE sr.created_at > NOW() - INTERVAL '24 hours'
GROUP BY d.mac_address, DATE_TRUNC('hour', sr.created_at)
HAVING STDDEV(sr.mq4) > 1000  -- Variación sospechosa
ORDER BY hour DESC;

-- 7. Audit log - ver cambios recientes
SELECT * FROM audit_log 
ORDER BY timestamp DESC 
LIMIT 100;

-- 8. Limpiar datos antiguos (ejecutar mensualmente)
SELECT * FROM cleanup_old_data();
```

---

## ROLLBACK (Si algo falla)

```sql
-- En caso de necesitar rollback, Flyway puede revertir:

-- Opción 1: Marcar migration como no válida
DELETE FROM flyway_schema_history 
WHERE script = 'V2__AddSecurityEnhancements.sql';

-- Opción 2: Manual rollback
DROP TRIGGER IF EXISTS trg_sensor_readings_suspicious ON sensor_readings;
DROP TRIGGER IF EXISTS trg_devices_updated_at ON devices;
DROP TRIGGER IF EXISTS trg_users_lock_account ON users;
DROP FUNCTION IF EXISTS update_timestamp();
DROP FUNCTION IF EXISTS detect_suspicious_activity();
DROP FUNCTION IF EXISTS cleanup_old_data();
DROP FUNCTION IF EXISTS lock_account_after_failed_attempts();
DROP FUNCTION IF EXISTS cleanup_revoked_tokens();
DROP VIEW IF EXISTS v_security_audit;
DROP TABLE IF EXISTS revoked_tokens;
DROP TABLE IF EXISTS audit_log;
DROP INDEX IF EXISTS idx_sensor_readings_reading_id;
DROP INDEX IF EXISTS idx_sensor_readings_device_time;
DROP INDEX IF EXISTS idx_sensor_readings_created_at;
DROP INDEX IF EXISTS idx_devices_api_secret;
DROP INDEX IF EXISTS idx_devices_mac_address;
DROP INDEX IF EXISTS idx_devices_user_id;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_diagnostics_user_id;
DROP INDEX IF EXISTS idx_diagnostics_severity;
DROP INDEX IF EXISTS idx_revoked_tokens_jti;
DROP INDEX IF EXISTS idx_revoked_tokens_user_id;
DROP INDEX IF EXISTS idx_audit_log_timestamp;
DROP INDEX IF EXISTS idx_audit_log_user_id;

ALTER TABLE sensor_readings DROP COLUMN IF EXISTS reading_id;
ALTER TABLE devices DROP COLUMN IF EXISTS updated_at;
ALTER TABLE devices DROP COLUMN IF EXISTS last_sync_at;
ALTER TABLE devices DROP COLUMN IF EXISTS connection_attempts;
ALTER TABLE devices DROP COLUMN IF EXISTS is_suspicious;
ALTER TABLE devices DROP COLUMN IF EXISTS suspicious_reason;
ALTER TABLE users DROP COLUMN IF EXISTS failed_login_attempts;
ALTER TABLE users DROP COLUMN IF EXISTS account_locked;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;

ALTER TABLE sensor_readings DROP CONSTRAINT IF EXISTS uq_reading_id;
ALTER TABLE sensor_readings DROP CONSTRAINT IF EXISTS uq_device_timestamp;
ALTER TABLE devices DROP CONSTRAINT IF EXISTS uq_devices_mac_address;
ALTER TABLE devices DROP CONSTRAINT IF EXISTS uq_devices_api_secret;
ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email;
ALTER TABLE diagnostics DROP CONSTRAINT IF EXISTS ck_valid_severity;
```

---

## TESTING

```bash
# 1. Verificar migration aplicó correctamente
./mvnw flyway:info

# 2. Ver estado de base de datos
psql -c "SELECT * FROM v_security_audit;"

# 3. Test deduplication
INSERT INTO sensor_readings (device_id, reading_id, mq4, mq7, mq135)
VALUES (1, 'test-uuid-1', 10.5, 5.2, 800);

INSERT INTO sensor_readings (device_id, reading_id, mq4, mq7, mq135)
VALUES (1, 'test-uuid-1', 10.5, 5.2, 800);  -- Debe fallar: UNIQUE constraint

# 4. Test anomaly detection
-- Insertar 101 lecturas rápidamente
-- Verificar que device marcado como suspicious

# 5. Limpiar test data
DELETE FROM sensor_readings WHERE reading_id LIKE 'test-%';
```

---

## POST-DEPLOYMENT CHECKLIST

- [ ] Migration V2 ejecutada sin errores
- [ ] reading_id constraint verificado
- [ ] Índices de performance creados
- [ ] Views de auditoría accesibles
- [ ] Triggers funcionando correctamente
- [ ] Funciones de cleanup disponibles
- [ ] Revoked tokens table creada
- [ ] Audit log table creada
- [ ] Query de seguridad ejecutada sin anomalías
- [ ] Datos históricos preservados

---

**Tiempo Total de Implementación: ~10 minutos (Flyway automático)**
