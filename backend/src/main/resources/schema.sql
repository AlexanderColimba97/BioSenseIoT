-- BioSense IoT - Safe Initialization Script

-- 1. CREATE TABLES IF THEY DO NOT EXIST
-- This script is idempotent para que pueda ejecutarse varias veces sin borrar datos.

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Health conditions master table
CREATE TABLE IF NOT EXISTS health_conditions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Mapping users to their health conditions (many-to-many)
CREATE TABLE IF NOT EXISTS user_health_mapping (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    condition_id INTEGER NOT NULL REFERENCES health_conditions(id) ON DELETE CASCADE,
    UNIQUE(user_id, condition_id)
);

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50),
    breed VARCHAR(100),
    vulnerabilities TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    name VARCHAR(100),
    api_secret VARCHAR(255),
    last_seen TIMESTAMP WITH TIME ZONE
);

-- User-device access mapping (many-to-many)
CREATE TABLE IF NOT EXISTS user_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_devices_user_device UNIQUE (user_id, device_id)
);

-- Backward compatibility for legacy devices table variants.
ALTER TABLE IF EXISTS devices
ADD COLUMN IF NOT EXISTS name VARCHAR(100);

ALTER TABLE IF EXISTS devices
ADD COLUMN IF NOT EXISTS api_secret VARCHAR(255);

ALTER TABLE IF EXISTS devices
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS user_devices
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'viewer';

ALTER TABLE IF EXISTS user_devices
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Backfill owner access for already-linked legacy devices
INSERT INTO user_devices (user_id, device_id, role)
SELECT d.user_id, d.id, 'owner'
FROM devices d
LEFT JOIN user_devices ud
        ON ud.user_id = d.user_id AND ud.device_id = d.id
WHERE d.user_id IS NOT NULL
    AND ud.id IS NULL;

-- Add api_secret column to existing databases (idempotent)
-- ALTERNATIVA: Si el error persiste, comenta la siguiente línea y ejecuta manualmente en pgAdmin
-- Para evitar problemas de parsing, se usa una sintaxis más simple:

-- Sensor readings table (Optimized for time-series)
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    reading_id VARCHAR(255),
    mq4_value DOUBLE PRECISION NOT NULL,
    mq7_value DOUBLE PRECISION NOT NULL,
    mq135_value DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(device_id, reading_id)
);

-- Backward compatibility: existing deployments may already have sensor_readings
-- without the new deduplication column/constraint.
ALTER TABLE IF EXISTS sensor_readings
ADD COLUMN IF NOT EXISTS reading_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sensor_readings_device_reading_id
ON sensor_readings(device_id, reading_id);

-- AI Diagnostics results
CREATE TABLE IF NOT EXISTS ai_diagnostics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_id BIGINT NOT NULL REFERENCES sensor_readings(id) ON DELETE CASCADE,
    diagnostic_text TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    recommendation TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. INDEXES (Idempotentes)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_timestamp ON sensor_readings(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_reading_id ON sensor_readings(reading_id) WHERE reading_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_user_id ON ai_diagnostics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_user_timestamp ON ai_diagnostics(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_reading_id ON ai_diagnostics(reading_id);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_mac_address ON devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);