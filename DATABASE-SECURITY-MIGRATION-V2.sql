-- Flyway Migration: V2__Add_Security_Fixes.sql
-- Purpose: Add security enhancements to the database schema

-- 1. Add UNIQUE constraint on reading_id for deduplication
ALTER TABLE IF EXISTS sensor_readings
ADD COLUMN IF NOT EXISTS reading_id VARCHAR(255) UNIQUE;

-- 2. Create index for reading_id deduplication lookups
CREATE INDEX IF NOT EXISTS idx_sensor_readings_reading_id ON sensor_readings(reading_id);

-- 3. Improve performance of device lookups by MAC address
CREATE INDEX IF NOT EXISTS idx_devices_user_id_active ON devices(user_id) WHERE user_id IS NOT NULL;

-- 4. Create audit log table for security events
CREATE TABLE IF NOT EXISTS security_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,
    status VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_device_id ON security_audit_log(device_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp ON security_audit_log(timestamp DESC);

-- 6. Create rate limiting state table
CREATE TABLE IF NOT EXISTS rate_limit_state (
    id SERIAL PRIMARY KEY,
    client_identifier VARCHAR(255) UNIQUE NOT NULL,
    tokens INTEGER DEFAULT 20,
    last_refill TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 hour'
);

-- 7. Create index for rate limiting cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_state_expires_at ON rate_limit_state(expires_at);

-- 8. Add device metadata columns for enhanced security tracking
ALTER TABLE IF EXISTS devices
ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 9. Create index for active device queries
CREATE INDEX IF NOT EXISTS idx_devices_is_active ON devices(is_active) WHERE is_active = true;

-- 10. Add columns to track JWT tokens
CREATE TABLE IF NOT EXISTS jwt_token_revocation (
    id BIGSERIAL PRIMARY KEY,
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255)
);

-- 11. Create index for token revocation lookups
CREATE INDEX IF NOT EXISTS idx_jwt_token_revocation_jti ON jwt_token_revocation(token_jti);
CREATE INDEX IF NOT EXISTS idx_jwt_token_revocation_user_id ON jwt_token_revocation(user_id);

-- 12. Add password reset token tracking
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Create index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
