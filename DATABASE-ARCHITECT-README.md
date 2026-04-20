╔═══════════════════════════════════════════════════════════════════════════════╗
║            ✅ DATABASE ARCHITECT SKILL - CREATED                             ║
║                                                                               ║
║         PostgreSQL expert for data integrity and performance                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🎯 SKILL DEFINITION
═══════════════════════════════════════════════════════════════════════════════

Name: Database Architect
Role: PostgreSQL Expert
Focus: Data integrity, performance, schema correctness
Technology: PostgreSQL + R2DBC reactive access


═══════════════════════════════════════════════════════════════════════════════
📋 MUST FOLLOW (Non-Negotiable Rules)
═══════════════════════════════════════════════════════════════════════════════

1️⃣  OBEY SYSTEM ARCHITECTURE GUARDIAN
    ├─ Device ownership (device → user)
    ├─ Data integrity constraints
    ├─ Authorization checks
    ├─ Audit trail
    └─ See: .instructions.md + ARCHITECTURE-GUARDIAN-GUIDE.md

2️⃣  DEVICE MUST BELONG TO A USER (Golden Rule)
    ├─ Every device has exactly ONE user
    ├─ Foreign key: devices.user_id → users.id
    ├─ ON DELETE CASCADE (delete device if user deleted)
    ├─ Authorization: User can only query their devices
    └─ No orphaned devices possible

3️⃣  ENFORCE FOREIGN KEYS (All Relationships)
    ├─ users → devices (one-to-many)
    ├─ devices → sensor_readings (one-to-many)
    ├─ devices → device_secrets (one-to-one)
    ├─ Every FK must have constraint
    └─ Prevent orphaned records

4️⃣  ENSURE DATA INTEGRITY (Multiple Layers)
    ├─ Check constraints (value ranges)
    ├─ Unique constraints (deduplication)
    ├─ NOT NULL constraints
    ├─ Foreign key constraints
    └─ Default values


═══════════════════════════════════════════════════════════════════════════════
🏗️ DATABASE SCHEMA (Complete Design)
═══════════════════════════════════════════════════════════════════════════════

USERS TABLE
──────────
id (UUID, PK)
email (VARCHAR, UNIQUE, NOT NULL)
email_verified (BOOLEAN)
password_hash (VARCHAR, NOT NULL)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

INDEX: email (for login lookups)


DEVICES TABLE
─────────────
id (UUID, PK)
user_id (UUID, FK → users, NOT NULL)  ← REQUIRED: Must have user!
name (VARCHAR, NOT NULL)
device_type (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

FOREIGN KEY: user_id → users.id (ON DELETE CASCADE)
INDEX: user_id (for "my devices" queries)


DEVICE_SECRETS TABLE
───────────────────
id (UUID, PK)
device_id (UUID, FK → devices, UNIQUE, NOT NULL)  ← One per device
secret_hash (VARCHAR, NOT NULL)
created_at (TIMESTAMP)

FOREIGN KEY: device_id → devices.id (ON DELETE CASCADE)
INDEX: device_id


SENSOR_READINGS TABLE
─────────────────────
id (UUID, PK)
device_id (UUID, FK → devices, NOT NULL)
reading_id (VARCHAR, NOT NULL)  ← Unique per device (dedup)
mq4 (FLOAT, NOT NULL, CHECK 0-10000)
mq7 (FLOAT, NOT NULL, CHECK 0-10000)
mq135 (FLOAT, NOT NULL, CHECK 0-10000)
timestamp (TIMESTAMP, NOT NULL)
created_at (TIMESTAMP)

FOREIGN KEY: device_id → devices.id (ON DELETE CASCADE)
UNIQUE: (device_id, reading_id)  ← Deduplication
INDEXES:
  • device_id (for readings by device)
  • timestamp DESC (for time-series queries)
  • (device_id, timestamp DESC) (composite for common join)

CHECK CONSTRAINTS:
  • mq4 >= 0 AND mq4 <= 10000
  • mq7 >= 0 AND mq7 <= 10000
  • mq135 >= 0 AND mq135 <= 10000
  • timestamp <= CURRENT_TIMESTAMP


AUDIT_LOGS TABLE
────────────────
id (UUID, PK)
user_id (UUID, FK → users, nullable)
device_id (UUID, FK → devices, nullable)
action (VARCHAR, NOT NULL)  ← "created", "updated", "deleted"
resource_type (VARCHAR, NOT NULL)  ← "user", "device", "reading"
resource_id (VARCHAR)
changes (JSONB)
ip_address (VARCHAR)
created_at (TIMESTAMP)

INDEXES:
  • created_at DESC (for recent logs)
  • user_id (for user activity)
  • device_id (for device activity)


═══════════════════════════════════════════════════════════════════════════════
✅ CORRECT PATTERNS (Copy These)
═══════════════════════════════════════════════════════════════════════════════

PATTERN 1: Foreign Keys with Constraints

CREATE TABLE devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,  -- ← Required!
    name VARCHAR(255) NOT NULL,
    
    -- Enforce user ownership
    CONSTRAINT fk_devices_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE  -- ← Delete device if user deleted
);

CREATE INDEX idx_devices_user_id ON devices(user_id);


PATTERN 2: Deduplication with Unique Constraints

CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    reading_id VARCHAR(255) NOT NULL,
    mq4 FLOAT NOT NULL,
    
    -- Prevent duplicate readings (same reading_id per device)
    CONSTRAINT unique_reading_id_per_device 
        UNIQUE (device_id, reading_id),
    
    CONSTRAINT fk_device_id 
        FOREIGN KEY (device_id) 
        REFERENCES devices(id) 
        ON DELETE CASCADE
);


PATTERN 3: Check Constraints for Value Ranges

CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    mq4 FLOAT NOT NULL CHECK (mq4 >= 0 AND mq4 <= 10000),
    mq7 FLOAT NOT NULL CHECK (mq7 >= 0 AND mq7 <= 10000),
    mq135 FLOAT NOT NULL CHECK (mq135 >= 0 AND mq135 <= 10000),
    timestamp TIMESTAMP NOT NULL CHECK (timestamp <= CURRENT_TIMESTAMP),
    
    CONSTRAINT fk_device_id FOREIGN KEY (device_id) REFERENCES devices(id)
);


PATTERN 4: Authorization in Queries

-- ✅ CORRECT: Only user's own data
SELECT sr.* 
FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.id
WHERE d.user_id = $1  -- Current user ID
AND sr.device_id = $2;

-- Alternative with EXISTS
SELECT sr.*
FROM sensor_readings sr
WHERE sr.device_id = $1
AND EXISTS (
    SELECT 1 FROM devices d
    WHERE d.id = sr.device_id
    AND d.user_id = $2  -- Current user
);


PATTERN 5: Composite Indexes for Common Joins

-- Get recent readings for a device
CREATE INDEX idx_readings_device_timestamp 
ON sensor_readings(device_id, timestamp DESC);

-- Query that uses this index
SELECT * FROM sensor_readings 
WHERE device_id = $1
ORDER BY timestamp DESC
LIMIT 100;


PATTERN 6: Batch Operations for Performance

-- Insert multiple readings at once
INSERT INTO sensor_readings 
(device_id, reading_id, mq4, mq7, mq135, timestamp)
VALUES
($1, $2, $3, $4, $5, $6),
($7, $8, $9, $10, $11, $12),
($13, $14, $15, $16, $17, $18)
ON CONFLICT (device_id, reading_id) DO NOTHING;


═══════════════════════════════════════════════════════════════════════════════
❌ WRONG PATTERNS (Never Do This)
═══════════════════════════════════════════════════════════════════════════════

WRONG 1: Missing Foreign Key

CREATE TABLE devices (
    id UUID PRIMARY KEY,
    name VARCHAR(255)
    -- ❌ Where's user_id? Device not owned by anyone!
);


WRONG 2: Device Without User

CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id VARCHAR(255)  -- ❌ Could be any string!
    -- ❌ No FK means device could be deleted, leaving orphaned reading
);


WRONG 3: No Deduplication

CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    device_id UUID,
    reading_id VARCHAR(255)
    -- ❌ Same reading_id can be inserted twice (no UNIQUE)
);


WRONG 4: No Authorization Check in Query

SELECT * FROM sensor_readings WHERE device_id = $1;
-- ❌ User can query ANY device!
-- What if device_id belongs to another user?


WRONG 5: Inefficient Index on PK

CREATE INDEX idx_id ON users(id);
-- ❌ Primary key already indexed!


WRONG 6: Multiple N+1 Queries

-- ❌ Slow: One query per device
foreach device in devices {
    readings = SELECT * FROM sensor_readings WHERE device_id = device.id
}

-- ✅ Fast: Single query with JOIN
SELECT sr.* FROM sensor_readings sr
JOIN devices d ON sr.device_id = d.id
WHERE d.user_id = current_user_id;


═══════════════════════════════════════════════════════════════════════════════
🔍 QUERY OPTIMIZATION
═══════════════════════════════════════════════════════════════════════════════

RULE 1: Index Foreign Keys
  CREATE INDEX idx_devices_user_id ON devices(user_id);
  CREATE INDEX idx_readings_device_id ON sensor_readings(device_id);

RULE 2: Index Filter Columns
  CREATE INDEX idx_readings_timestamp ON sensor_readings(timestamp DESC);

RULE 3: Use Composite Indexes for Joins
  CREATE INDEX idx_readings_device_timestamp 
    ON sensor_readings(device_id, timestamp DESC);

RULE 4: Use EXPLAIN ANALYZE
  EXPLAIN ANALYZE SELECT * FROM sensor_readings WHERE device_id = $1;
  
  Look for:
  ✅ Index Scan (good)
  ✅ Low cost (good)
  ❌ Sequential Scan (bad, create index)
  ❌ High cost (bad, rewrite query)

RULE 5: Batch Operations
  INSERT multiple rows in one statement
  Update multiple rows in one statement
  Use ON CONFLICT for deduplication

RULE 6: Avoid N+1 Queries
  ❌ Query device, then per-device query readings
  ✅ Single JOIN query for all data


═══════════════════════════════════════════════════════════════════════════════
✅ CODE REVIEW CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

SCHEMA DESIGN:
  [ ] Device has user_id (FK required)
  [ ] All FKs enforced with constraints
  [ ] No orphaned records possible
  [ ] Check constraints for valid data
  [ ] Unique constraints prevent duplicates
  [ ] NOT NULL on required columns

DATA INTEGRITY:
  [ ] Deduplication (unique reading_id per device)
  [ ] Value ranges checked (0-10000 for sensors)
  [ ] Timestamps not in future
  [ ] User cannot query others' data
  [ ] Authorization checks in queries

PERFORMANCE:
  [ ] Indexes on foreign keys
  [ ] Indexes on filter columns
  [ ] Composite indexes for joins
  [ ] No unnecessary indexes
  [ ] EXPLAIN ANALYZE run
  [ ] N+1 queries avoided

QUERIES:
  [ ] JOINs used (not subqueries for performance)
  [ ] SELECT * avoided (specify columns)
  [ ] LIMIT used for large results
  [ ] Authorization checks present
  [ ] Batch operations where applicable

MIGRATIONS:
  [ ] Backward compatible
  [ ] No data loss
  [ ] Atomic operations
  [ ] Tested locally
  [ ] Rollback documented


═══════════════════════════════════════════════════════════════════════════════
🚫 FORBIDDEN (Will Be Rejected)
═══════════════════════════════════════════════════════════════════════════════

❌ Missing Foreign Keys
   Device without user_id
   Readings without device_id FK
   Secrets without device_id FK

❌ No Deduplication
   Duplicate reading_id possible
   Same sensor reading inserted twice

❌ No Authorization Checks
   User queries any device
   User sees other users' data
   No row-level security

❌ Inefficient Indexes
   Index on primary key
   Index on low-cardinality column
   Too many indexes

❌ N+1 Queries
   One query per object
   No JOINs
   Nested loops


═══════════════════════════════════════════════════════════════════════════════
💡 KEY PRINCIPLES
═══════════════════════════════════════════════════════════════════════════════

1. DEVICE BELONGS TO USER
   Always, no exceptions. User_id is required on devices.

2. FOREIGN KEYS ENFORCED
   All relationships have constraints. Prevents orphaned records.

3. DATA INTEGRITY FIRST
   Check constraints, not application validation.

4. AUTHORIZATION IN DATABASE
   Row-level security, not just in application.

5. INDEXES ON FKs
   Every foreign key should have an index.

6. BATCH OPERATIONS
   One INSERT with multiple rows > multiple INSERTs.

7. EXPLAIN ANALYZE
   Test query performance before deployment.

8. DEDUPLICATION
   UNIQUE constraints prevent duplicate readings.


═══════════════════════════════════════════════════════════════════════════════
🚀 WHEN TO USE THIS SKILL
═══════════════════════════════════════════════════════════════════════════════

Use this skill when:
  ✅ Designing database schema
  ✅ Adding new tables or columns
  ✅ Creating indexes
  ✅ Writing SQL queries
  ✅ Optimizing query performance
  ✅ Creating data migrations
  ✅ Reviewing SQL from others


═══════════════════════════════════════════════════════════════════════════════

🎉 DATABASE ARCHITECT SKILL - READY TO USE

Status: ✅ Active
Version: 1.0
Created: 2024-04-20

Use this skill alongside System Architecture Guardian for maximum compliance!
