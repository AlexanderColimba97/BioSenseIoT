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
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    name VARCHAR(100),
    last_seen TIMESTAMP WITH TIME ZONE
);

-- Make sure existing device table can store unlinked ESP32 devices until a user links them
ALTER TABLE IF EXISTS devices ALTER COLUMN user_id DROP NOT NULL;

-- Sensor readings table (Optimized for time-series)
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    mq4_value DOUBLE PRECISION NOT NULL,
    mq7_value DOUBLE PRECISION NOT NULL,
    mq135_value DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

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
CREATE INDEX IF NOT EXISTS idx_ai_diagnostics_user_id ON ai_diagnostics(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
