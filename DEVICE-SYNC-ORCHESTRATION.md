# 🎼 DEVICE SYNCHRONIZATION ORCHESTRATION

## 🏗️ System Architecture Guardian - Primary Authority

**Three Sacred Rules Applied:**

| Rule | Implementation |
|------|-----------------|
| **Rule 1: Authenticate Correctly** | User JWT for device linking, API Secret for sensor ingestion, no API keys |
| **Rule 2: Trust Only the Server** | MAC address verified on each request, API secret generated server-side, device ownership enforced |
| **Rule 3: Keep Layers Clean** | Controller → Service → Repository pattern, BLE provisioning isolated from sensor loop |

---

## 🎨 FRONTEND UI SPECIALIST ROLE

### Sync Button Component
**File**: `frontend/components/SyncDeviceModal.tsx`

**Responsibilities**:
- ✅ BLE device scanning and connection
- ✅ Secure token management (memory-only storage)
- ✅ Display MAC address validation
- ✅ WiFi credential input
- ✅ API Secret display for user reference
- ✅ Error handling with user feedback

**Key Patterns**:
```typescript
// Before BLE write: Ensure device is registered
const { apiSecret } = await registerDeviceWithBackend();

// Send credentials via BLE
await bleCharacteristic.write([SSID, PASSWORD, apiSecret]);

// Handle responses
if (response.status === 401) → "Device not authorized"
if (response.status === 409) → "Device unlinked"
if (response.status === 500) → "Backend error, retry"
```

**Security Rules**:
- ❌ Never store token in localStorage
- ✅ Keep token in memory only (lost on refresh is intentional)
- ✅ Include Authorization header on all requests
- ✅ Handle 401 by redirecting to login

---

## 🔧 BACKEND REACTIVE SPECIALIST ROLE

### Device Registration Endpoint
**File**: `backend/src/main/java/.../DeviceControllerV2.java`

**Endpoint**: `POST /api/v2/devices/link`

**Responsibilities**:
- ✅ Authenticate user via JWT
- ✅ Register device in database
- ✅ Generate API Secret (bsk_[UUID])
- ✅ Return secret to frontend
- ✅ Enforce reactive programming (Mono/Flux)
- ✅ No blocking calls (R2DBC, not JPA)

**Key Pattern**:
```java
@PostMapping("/link")
public Mono<ResponseEntity<DeviceLinkResponseDto>> linkDevice(
    @RequestBody LinkDeviceRequestDto request,
    @AuthenticationPrincipal Mono<JwtAuthenticationToken> auth
) {
    return auth
        .flatMap(token -> linkDeviceUseCase.execute(...))
        .map(result → ResponseEntity.ok(
            new DeviceLinkResponseDto(
                result.getDeviceId(),
                result.getMacAddress(),
                result.getDeviceName(),
                result.getApiSecret()  // ← EXPOSED FOR FIRST-TIME SETUP
            )
        ))
        .onErrorResume(handleErrors);  // Proper error handling
}
```

### Sensor Ingestion Endpoint
**File**: `backend/src/main/java/.../SensorControllerV2.java`

**Endpoint**: `POST /api/v2/sensors/reading`

**Responsibilities**:
- ✅ Validate X-BioSense-Key header (device auth)
- ✅ Verify device exists and is linked (user_id ≠ NULL)
- ✅ Prevent duplicate readings (UNIQUE on device_id, reading_id)
- ✅ Save sensor data
- ✅ Generate AI diagnostics
- ✅ Return air quality state

**Security Validation**:
```
1. Device must exist in DB (by MAC)
2. Device must be linked to a user (user_id ≠ NULL)
3. API Secret must match stored secret
4. Reading ID must be unique per device
5. Sensor values must be in valid ranges (0-10000)
```

---

## 🗄️ DATABASE ARCHITECT ROLE

### Schema Relationships
**File**: `backend/src/main/resources/schema.sql`

```
users (1)
  ↓ (1:N)
devices (N)
  ├─ user_id (FK → users.id, ON DELETE CASCADE)
  ├─ mac_address (UNIQUE, NOT NULL)
  └─ api_secret (VARCHAR, stored server-side)

devices (1)
  ↓ (1:N)
sensor_readings (N)
  ├─ device_id (FK → devices.id, ON DELETE CASCADE)
  ├─ reading_id (VARCHAR, UNIQUE per device)
  ├─ mq4, mq7, mq135 (DOUBLE PRECISION)
  └─ timestamp (TIMESTAMP)
```

### Constraints Applied
- ✅ Foreign key: device.user_id → users.id
- ✅ Unique: mac_address (one per device)
- ✅ Unique: (device_id, reading_id) - deduplication
- ✅ Not Null: user_id (for linked devices)
- ✅ Cascading deletes: delete user → delete devices → delete readings

### Indexes
```sql
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_mac ON devices(mac_address);
CREATE INDEX idx_readings_device_timestamp ON sensor_readings(device_id, timestamp DESC);
CREATE INDEX idx_devices_user_id_mac ON devices(user_id, mac_address);
```

---

## 📡 ESP32 IOT SPECIALIST ROLE

### Device Lifecycle States

```
UNPROVISIONED
    ↓ (BLE receives credentials)
PROVISIONING
    ↓ (restart and load NVS)
CONNECTING
    ├─ SUCCESS → CONNECTED
    └─ FAILURE → ERROR (fallback to BLE)

CONNECTED
    ↓ (every 10 seconds)
SENDING (POST sensor data)
    ├─ HTTP 200 → Continue sending
    ├─ HTTP 401 → AUTH_FAILED (device not linked)
    ├─ HTTP 409 → AUTH_FAILED (device unlinked)
    ├─ HTTP 5xx → Retry with exponential backoff
    └─ Network error → Retry with exponential backoff
```

### BLE Provisioning Protocol

**Format**: `SSID,PASSWORD,API_SECRET`

**Example**:
```
Home-WiFi,MyPassword123,bsk_550e8400-e29b-41d4-a716-446655440000
```

**What happens**:
1. Frontend sends via BLE characteristic write
2. ESP32 parses three comma-separated values
3. Stores to NVS (non-volatile storage)
4. Restarts ESP32
5. Loads NVS and attempts WiFi connection

### Sensor Ingestion Protocol

**Endpoint**: `POST https://[BACKEND]/api/v2/sensors/reading`

**Headers**:
```
X-BioSense-Key: bsk_550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

**Payload**:
```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "mq4": 150.5,
  "mq7": 89.3,
  "mq135": 210.7,
  "readingId": "1234567890_5482"
}
```

**Response Codes**:
- 200 ✅ Reading accepted and saved
- 401 ❌ API Secret invalid or missing
- 409 ❌ Device not linked to user
- 429 ⏳ Rate limit exceeded (retry later)
- 503 ⏳ Backend temporarily unavailable (retry later)

---

## 🔄 END-TO-END SYNC FLOW

### Flow Diagram

```
USER INTERACTION
├─ 1️⃣ Powers on ESP32 (no saved WiFi)
│  └─ ESP32 enters BLE mode
│
├─ 2️⃣ Opens app → Scans Bluetooth
│  └─ Frontend finds: BioSense-[MAC]
│
├─ 3️⃣ Selects device + Enters name
│  └─ Frontend connects via BLE
│
├─ 4️⃣ Enters WiFi credentials
│  └─ Frontend reads device MAC
│
├─ 5️⃣ Clicks "SINCRONIZAR"
│  └─ Frontend calls: POST /api/v2/devices/link [WITH USER JWT]
│     Response: { deviceId, macAddress, apiSecret }
│
├─ 6️⃣ Frontend sends via BLE
│  └─ Payload: "SSID,PASSWORD,apiSecret"
│     ESP32 stores to NVS and restarts
│
├─ 7️⃣ ESP32 connects to WiFi
│  └─ Reads NVS, initiates WiFi connection
│
├─ 8️⃣ ESP32 starts sending sensor data
│  └─ Every 10 seconds:
│     POST /api/v2/sensors/reading [WITH X-BioSense-Key HEADER]
│     Backend verifies device is linked and saves reading
│
└─ 9️⃣ Frontend displays real-time data
   └─ GET /api/v2/devices/my-devices
      Dashboard shows active device with readings
```

---

## 🔐 CRITICAL SECURITY CHECKS

### ✅ Authentication
- [x] User must login first (User JWT required)
- [x] Device registration requires User JWT
- [x] Sensor ingestion requires X-BioSense-Key header
- [x] API Secret is unique per device (bsk_[UUID])
- [x] No API keys in code or environment

### ✅ Device Ownership
- [x] Device linked to exactly ONE user (foreign key constraint)
- [x] User can only see their own devices
- [x] User can only modify their own devices
- [x] Deleting user cascades delete to devices

### ✅ Data Integrity
- [x] Sensor readings are immutable after creation
- [x] Duplicate readings prevented (UNIQUE on device_id, reading_id)
- [x] Device MAC validated on each request
- [x] API Secret compared server-side

### ✅ Network Security
- [x] All HTTP communication → HTTPS only
- [x] ESP32 validates TLS certificate
- [x] BLE communication uses secure channel
- [x] Tokens never transmitted in query params or URLs

---

## 🚀 IMPLEMENTATION ORDER

**Phase 1: Database** (Day 1)
```sql
ALTER TABLE sensor_readings
ADD CONSTRAINT unique_reading_per_device UNIQUE (device_id, reading_id);

CREATE INDEX idx_readings_device_timestamp 
    ON sensor_readings(device_id, timestamp DESC);
```

**Phase 2: Backend** (Day 2-3)
- [ ] Update `DeviceControllerV2.java` → Return apiSecret
- [ ] Update `DeviceLinkResponseDto.java` → Add apiSecret field
- [ ] Update `SecurityConfig.java` → Require auth for sensor endpoint
- [ ] Update `IngestSensorReadingUseCaseImpl.java` → Validate device ownership
- [ ] Update `R2dbcSensorRepositoryAdapter.java` → Enhanced queries

**Phase 3: Frontend** (Day 3-4)
- [ ] Update `SyncDeviceModal.tsx` → Display apiSecret
- [ ] Update `device-service.ts` → Handle apiSecret response
- [ ] Add error handling for 401/409 responses
- [ ] Add retry logic with exponential backoff

**Phase 4: ESP32 Firmware** (Day 4-5)
- [ ] Add state machine (UNPROVISIONED, PROVISIONING, CONNECTED, ERROR)
- [ ] Add deduplication buffer for readings
- [ ] Implement retry logic with exponential backoff
- [ ] Add better error messages to Serial output
- [ ] Test with actual WiFi and backend

**Phase 5: Testing** (Day 6)
- [ ] End-to-end sync test
- [ ] Duplicate reading prevention test
- [ ] Error handling (401, 409, 503)
- [ ] Device ownership enforcement
- [ ] Data validation (sensor ranges)

---

## 📊 FILES TO MODIFY

### Backend
```
backend/src/main/java/.../
├─ device/infrastructure/adapter/in/web/DeviceControllerV2.java
├─ device/application/usecase/LinkDeviceUseCaseImpl.java
├─ device/infrastructure/adapter/out/persistence/R2dbcDeviceRepositoryAdapter.java
├─ sensor/infrastructure/adapter/in/web/SensorControllerV2.java
├─ sensor/application/usecase/IngestSensorReadingUseCaseImpl.java
├─ sensor/infrastructure/adapter/out/persistence/R2dbcSensorRepositoryAdapter.java
├─ config/SecurityConfig.java
└─ config/RateLimitingFilter.java
```

### Frontend
```
frontend/
├─ components/SyncDeviceModal.tsx
├─ lib/device-service.ts
├─ lib/auth-service.ts
└─ app/ProfilePage.tsx (or where sync button is used)
```

### Database
```
backend/src/main/resources/
└─ migrations/
    ├─ 001_add_reading_deduplication.sql
    └─ 002_add_performance_indexes.sql
```

### ESP32 Firmware
```
hardware/esp32_biosense/
└─ biosense_esp32.ino (comprehensive update)
```

---

## ✅ VALIDATION SCRIPT

```bash
#!/bin/bash
# validate-device-sync.sh

echo "🔍 Validating Device Sync Implementation..."

# Check Database
echo "1️⃣ Database Checks:"
psql -d biosense -c "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='sensor_readings' AND constraint_type='UNIQUE';" | grep -q "unique_reading_per_device" && echo "✅ Deduplication UNIQUE constraint" || echo "❌ Missing deduplication constraint"

# Check Backend Endpoints
echo "2️⃣ Backend Endpoint Checks:"
curl -s http://localhost:8080/api/v2/devices/link -H "Authorization: Bearer test" -X POST | grep -q "error" && echo "✅ Link endpoint requires auth" || echo "❌ Link endpoint allows without auth"

# Check Security Config
echo "3️⃣ Security Configuration:"
grep -q "permitAll.*sensors/reading" backend/src/main/java/com/biosense/iot/config/SecurityConfig.java && echo "❌ Sensor endpoint still allows anonymous access" || echo "✅ Sensor endpoint requires authentication"

# Check ESP32 Firmware
echo "4️⃣ ESP32 Firmware Checks:"
grep -q "STATE_UNPROVISIONED\|STATE_PROVISIONING\|STATE_CONNECTED" hardware/esp32_biosense/biosense_esp32.ino && echo "✅ Device state machine implemented" || echo "❌ Device state machine missing"

grep -q "isDuplicateReading\|addToBuffer" hardware/esp32_biosense/biosense_esp32.ino && echo "✅ Deduplication buffer implemented" || echo "❌ Deduplication buffer missing"

echo ""
echo "✅ Validation Complete!"
```

---

## 📈 SUCCESS METRICS

### Before Fix
- ❌ Device sync button non-functional
- ❌ No device-to-user linking
- ❌ No sensor data storage
- ❌ No deduplication
- ❌ Security vulnerabilities

### After Fix
- ✅ User presses sync button
- ✅ Device registers in backend
- ✅ API secret sent to ESP32 via BLE
- ✅ ESP32 connects to WiFi
- ✅ Sensor data flows: ESP32 → Backend → Frontend
- ✅ No duplicate readings
- ✅ All Three Sacred Rules enforced
- ✅ Zero security vulnerabilities

---

## 🎯 GUARDRAILS (What NOT to Do)

### ❌ Frontend
- Don't store token in localStorage
- Don't log tokens to console
- Don't expose API secret in UI
- Don't make unencrypted requests

### ❌ Backend
- Don't use API keys in code
- Don't allow unlinked devices to send data
- Don't permit anonymous access to sensor endpoint
- Don't trust client-provided device IDs

### ❌ Database
- Don't allow NULL user_id on active devices
- Don't create devices without MAC addresses
- Don't allow duplicate readings per device
- Don't forget cascading deletes

### ❌ ESP32
- Don't use HTTP (HTTPS only)
- Don't hardcode API keys
- Don't skip retry logic
- Don't send sensitive data in debug logs

---

## 🔗 RELATED DOCUMENTATION

- `.instructions.md` → Three Sacred Rules
- `ARCHITECTURE-GUARDIAN-GUIDE.md` → Code review workflow
- `BACKEND-REACTIVE-SPECIALIST-SKILL.md` → Spring Boot patterns
- `ESP32-IOT-SPECIALIST-SKILL.md` → Firmware patterns
- `DATABASE-ARCHITECT-SKILL.md` → Schema design
- `FRONTEND-UI-SPECIALIST-SKILL.md` → React/Next.js patterns
- `COMO-USAR-LAS-SKILLS.md` → How to use the skills

---

**🚀 Status: READY FOR IMPLEMENTATION**

All components coordinated, all security checks in place, all code patterns documented.

Start with Phase 1 (Database) and proceed sequentially.

