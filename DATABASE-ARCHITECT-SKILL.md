# 🗄️ Database Architect Skill

> PostgreSQL expert for BioSenseIoT data integrity and performance  
> Enforcing schema correctness, foreign keys, and query optimization

---

## 🎯 Role Definition

**Specialist**: PostgreSQL Database Architect

**Expertise**:
- PostgreSQL schema design
- Data integrity constraints
- Foreign key relationships
- Query optimization
- Performance tuning
- Indexing strategies
- Migration management

**Responsibility**: Design and maintain secure, performant, correct database

---

## 📋 MUST FOLLOW (Non-Negotiable)

### 1. Obey System Architecture Guardian

Every database change MUST comply with:
- **Device ownership** (device must belong to user)
- **Data integrity** (foreign keys, constraints)
- **Authorization** (row-level security where needed)
- **Audit trail** (who changed what, when)

See: `.instructions.md` + `ARCHITECTURE-GUARDIAN-GUIDE.md`

### 2. Device Must Belong to a User

**Golden Rule**: A device is OWNED by exactly ONE user.

```sql
-- ✅ CORRECT: device must have user_id (foreign key)
CREATE TABLE devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- CONSTRAINT: User cannot be NULL
    CONSTRAINT devices_user_id_not_null CHECK (user_id IS NOT NULL),
    
    -- FOREIGN KEY: Enforce user ownership
    CONSTRAINT fk_devices_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- ✅ CORRECT: Sensor reading must belong to a device which belongs to a user
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    reading_id VARCHAR(255) NOT NULL,
    mq4 FLOAT NOT NULL,
    mq7 FLOAT NOT NULL,
    mq135 FLOAT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- FOREIGN KEY: Reading must belong to existing device
    CONSTRAINT fk_readings_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE CASCADE,
    
    -- UNIQUE: Prevent duplicate readings
    CONSTRAINT unique_reading_id_per_device 
        UNIQUE (device_id, reading_id)
);
```

**Authorization Pattern**:

```sql
-- ✅ CORRECT: User can only query their own devices
SELECT sr.* 
FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.id
WHERE d.user_id = current_user_id
AND d.id = device_id;

-- ❌ WRONG: No user_id check
SELECT sr.* 
FROM sensor_readings sr
WHERE sr.device_id = device_id;
-- User could access any device!
```

### 3. Enforce Foreign Keys

**ALL relationships must have foreign keys**:

```sql
-- ✅ CORRECT: All FKs enforced
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT fk_devices_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    reading_id VARCHAR(255) NOT NULL,
    CONSTRAINT fk_readings_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE CASCADE,
    CONSTRAINT unique_reading_id 
        UNIQUE (device_id, reading_id)
);

CREATE TABLE device_secrets (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL UNIQUE,  -- One secret per device
    secret_hash VARCHAR(255) NOT NULL,
    CONSTRAINT fk_device_secrets_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE CASCADE
);

-- ❌ WRONG: No foreign keys
CREATE TABLE sensor_readings_bad (
    id UUID PRIMARY KEY,
    device_id VARCHAR(255),  -- Could be any string!
    reading_id VARCHAR(255)
    -- No constraints, no enforced relationships
);
```

### 4. Ensure Data Integrity

**Constraints are the first line of defense**:

```sql
-- ✅ CORRECT: Multiple integrity constraints
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    reading_id VARCHAR(255) NOT NULL,
    
    -- Value constraints (MQ sensors: 0-10000)
    mq4 FLOAT NOT NULL CHECK (mq4 >= 0 AND mq4 <= 10000),
    mq7 FLOAT NOT NULL CHECK (mq7 >= 0 AND mq7 <= 10000),
    mq135 FLOAT NOT NULL CHECK (mq135 >= 0 AND mq135 <= 10000),
    
    -- Timestamp must not be future
    timestamp TIMESTAMP NOT NULL CHECK (timestamp <= CURRENT_TIMESTAMP),
    
    -- Deduplication (same reading_id cannot be inserted twice per device)
    CONSTRAINT unique_reading_id 
        UNIQUE (device_id, reading_id),
    
    -- Foreign key to device
    CONSTRAINT fk_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE CASCADE,
    
    -- Index for common queries
    CONSTRAINT idx_device_timestamp 
        FOREIGN KEY (device_id, timestamp DESC)
);

-- ✅ CORRECT: Check constraints for valid states
CREATE TABLE device_activations (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL 
        CHECK (status IN ('pending', 'active', 'inactive', 'revoked')),
    activated_at TIMESTAMP,
    
    -- Only 'active' devices can have an activated_at time
    CONSTRAINT active_must_have_timestamp 
        CHECK (status != 'active' OR activated_at IS NOT NULL),
    
    CONSTRAINT fk_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE CASCADE
);
```

---

## 📐 Database Schema (Complete)

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX idx_users_email ON users(email);
```

### Devices Table

```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(100),
    
    -- Device must belong to a user
    CONSTRAINT fk_devices_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_devices_user_id ON devices(user_id)
);
```

### Device Secrets Table

```sql
CREATE TABLE device_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL UNIQUE,
    secret_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One secret per device
    CONSTRAINT fk_device_secrets_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT idx_device_secrets_device_id ON device_secrets(device_id)
);
```

### Sensor Readings Table

```sql
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    reading_id VARCHAR(255) NOT NULL,
    
    -- Sensor values (0-10000 range)
    mq4 FLOAT NOT NULL CHECK (mq4 >= 0 AND mq4 <= 10000),
    mq7 FLOAT NOT NULL CHECK (mq7 >= 0 AND mq7 <= 10000),
    mq135 FLOAT NOT NULL CHECK (mq135 >= 0 AND mq135 <= 10000),
    
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Device ownership
    CONSTRAINT fk_readings_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE CASCADE,
    
    -- Deduplication by reading_id per device
    CONSTRAINT unique_reading_id_per_device 
        UNIQUE (device_id, reading_id),
    
    -- Indexes for common queries
    CONSTRAINT idx_readings_device_id ON sensor_readings(device_id),
    CONSTRAINT idx_readings_timestamp ON sensor_readings(timestamp DESC),
    CONSTRAINT idx_readings_device_timestamp ON sensor_readings(device_id, timestamp DESC)
);
```

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    device_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    changes JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_audit_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_audit_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE SET NULL,
    
    INDEX idx_audit_created_at ON audit_logs(created_at DESC),
    INDEX idx_audit_user_id ON audit_logs(user_id),
    INDEX idx_audit_device_id ON audit_logs(device_id)
);
```

---

## 🔍 Query Optimization

### 1. Use Indexes Strategically

```sql
-- ✅ CORRECT: Indexes on foreign keys
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_readings_device_id ON sensor_readings(device_id);

-- ✅ CORRECT: Indexes on filtered columns
CREATE INDEX idx_readings_timestamp ON sensor_readings(timestamp DESC);

-- ✅ CORRECT: Composite indexes for common joins
CREATE INDEX idx_readings_device_timestamp 
ON sensor_readings(device_id, timestamp DESC);

-- ✅ CORRECT: Partial indexes for status
CREATE INDEX idx_devices_active 
ON devices(id) 
WHERE deleted_at IS NULL;

-- ❌ WRONG: Index on low-cardinality column
CREATE INDEX idx_readings_mq4 ON sensor_readings(mq4);
-- Every reading has different mq4, won't help

-- ❌ WRONG: Index on already-indexed column
CREATE INDEX idx_id ON users(id);
-- Primary key is already indexed!
```

### 2. Optimize Common Queries

```sql
-- ❌ SLOW: N+1 queries (one per reading)
SELECT * FROM sensor_readings WHERE device_id = $1;
-- Then for each reading, query the device:
SELECT * FROM devices WHERE id = $1;

-- ✅ FAST: Join in single query
SELECT 
    sr.id,
    sr.reading_id,
    sr.mq4,
    sr.mq7,
    sr.mq135,
    sr.timestamp,
    d.name as device_name
FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.id
WHERE sr.device_id = $1
ORDER BY sr.timestamp DESC
LIMIT 100;

-- ✅ FAST: Use EXISTS for authorization check
SELECT sr.*
FROM sensor_readings sr
WHERE sr.device_id = $1
AND EXISTS (
    SELECT 1 FROM devices d
    WHERE d.id = sr.device_id
    AND d.user_id = $2  -- Current user
);

-- ❌ SLOW: Unnecessary subquery
SELECT * FROM sensor_readings 
WHERE device_id IN (
    SELECT id FROM devices WHERE user_id = $1
);
-- Better to use JOIN
```

### 3. Batch Operations

```sql
-- ✅ CORRECT: Batch insert (single operation)
INSERT INTO sensor_readings 
(device_id, reading_id, mq4, mq7, mq135, timestamp)
VALUES
($1, $2, $3, $4, $5, $6),
($7, $8, $9, $10, $11, $12),
($13, $14, $15, $16, $17, $18)
ON CONFLICT (device_id, reading_id) DO NOTHING;

-- ❌ WRONG: Multiple individual inserts
INSERT INTO sensor_readings VALUES (...);
INSERT INTO sensor_readings VALUES (...);
INSERT INTO sensor_readings VALUES (...);
-- Slower, more overhead
```

### 4. Use EXPLAIN ANALYZE

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT sr.* 
FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.id
WHERE d.user_id = $1
ORDER BY sr.timestamp DESC
LIMIT 100;

-- Look for:
-- ✅ Index scans (good)
-- ✅ Low cost (good)
-- ❌ Sequential scans (bad, create index)
-- ❌ High cost (bad, optimize query)
```

---

## ✅ Code Review Checklist

Before approving any database changes:

SCHEMA DESIGN:
- [ ] Device has user_id (foreign key)
- [ ] All FKs enforced with constraints
- [ ] No orphaned records possible
- [ ] Check constraints for valid data
- [ ] Unique constraints prevent duplicates
- [ ] NOT NULL on required columns

DATA INTEGRITY:
- [ ] Deduplication (unique reading_id per device)
- [ ] Value ranges checked (0-10000)
- [ ] Timestamps not in future
- [ ] Status values enum-like
- [ ] User cannot query others' data

PERFORMANCE:
- [ ] Indexes on foreign keys
- [ ] Indexes on filter columns
- [ ] Composite indexes for joins
- [ ] No unnecessary indexes
- [ ] EXPLAIN ANALYZE run

QUERIES:
- [ ] No N+1 queries
- [ ] Joins used (not subqueries)
- [ ] SELECT * avoided (specify columns)
- [ ] LIMIT used for large results
- [ ] Authorization checks present

MIGRATIONS:
- [ ] Backward compatible
- [ ] No data loss
- [ ] Atomic operations
- [ ] Tested locally
- [ ] Rollback procedure documented


---

## ❌ FORBIDDEN (Will Be Rejected)

### 1. Missing Foreign Keys

```sql
-- ❌ WRONG: No foreign key
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id VARCHAR(255),  -- Could be any string!
    reading_id VARCHAR(255)
);

-- ✅ CORRECT
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    reading_id VARCHAR(255),
    CONSTRAINT fk_device_id FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

### 2. Device Without User

```sql
-- ❌ WRONG: Device can exist without user
CREATE TABLE devices (
    id UUID PRIMARY KEY,
    name VARCHAR(255)
    -- Where's the user_id???
);

-- ✅ CORRECT
CREATE TABLE devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3. No Deduplication

```sql
-- ❌ WRONG: Duplicate readings possible
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID,
    reading_id VARCHAR(255),
    mq4 FLOAT
    -- Same reading_id can be inserted twice!
);

-- ✅ CORRECT
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID,
    reading_id VARCHAR(255),
    mq4 FLOAT,
    CONSTRAINT unique_reading_id UNIQUE (device_id, reading_id)
);
```

### 4. No Authorization Checks in Queries

```sql
-- ❌ WRONG: User can access any device's data
SELECT * FROM sensor_readings WHERE device_id = $1;

-- ✅ CORRECT: Check user owns device
SELECT sr.* FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.id
WHERE d.user_id = current_user_id
AND sr.device_id = $1;
```

### 5. Inefficient Indexes

```sql
-- ❌ WRONG: Index on primary key (already indexed)
CREATE INDEX idx_id ON users(id);

-- ❌ WRONG: Index on low-cardinality column
CREATE INDEX idx_status ON devices(status);
-- Only ~5 values, won't help

-- ✅ CORRECT: Index on foreign keys
CREATE INDEX idx_devices_user_id ON devices(user_id);

-- ✅ CORRECT: Composite index for joins
CREATE INDEX idx_readings_device_timestamp 
ON sensor_readings(device_id, timestamp DESC);
```

---

## 🚀 When to Use This Skill

Use this skill when:
- Designing database schema
- Adding new tables or columns
- Optimizing queries
- Creating/adjusting indexes
- Writing data migrations
- Reviewing SQL queries
- Ensuring data integrity

---

## 📚 Reference Materials

Guardian System:
- `.instructions.md` → Core architecture rules
- `ARCHITECTURE-GUARDIAN-GUIDE.md` → Patterns and workflows

PostgreSQL Docs:
- Constraints and foreign keys
- Index types and strategies
- Query planning (EXPLAIN ANALYZE)
- Performance tuning

---

**Skill Status**: ✅ Active and Ready  
**Version**: 1.0  
**Created**: 2024-04-20  

Use alongside System Architecture Guardian for maximum compliance!
