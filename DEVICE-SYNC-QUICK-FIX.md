# ⚡ QUICK FIX GUIDE: Device Synchronization

> TL;DR - Make the sync button work end-to-end

---

## 🎯 What's Broken?

User clicks "Sync Device" → Nothing happens → Device never links

---

## 🔧 What to Fix (Priority Order)

### 1️⃣ BACKEND (First - Most Critical)

**File**: `backend/src/main/java/com/biosense/iot/config/SecurityConfig.java`

**Change**: Line ~53

```java
// ❌ BEFORE
.requestMatchers(HttpMethod.POST, "/api/v2/sensors/reading").permitAll()

// ✅ AFTER
.requestMatchers(HttpMethod.POST, "/api/v2/sensors/reading")
    .access(this::validateSensorAuth)  // Require X-BioSense-Key
```

**Why**: Currently ANY client can send data. Need to enforce device authentication.

---

**File**: `backend/src/main/java/com/biosense/iot/device/infrastructure/adapter/in/web/DeviceControllerV2.java`

**Change**: Add apiSecret to response

```java
// ✅ ADD THIS RESPONSE DTO
@Data
public class DeviceLinkResponseDto {
    private String deviceId;
    private String macAddress;
    private String deviceName;
    private String apiSecret;  // ← ADD THIS
}

// ✅ UPDATE ENDPOINT TO RETURN DTO
@PostMapping("/link")
public Mono<ResponseEntity<DeviceLinkResponseDto>> linkDevice(...) {
    // ... existing logic ...
    return result.map(device -> ResponseEntity.ok(
        new DeviceLinkResponseDto(
            device.getId(),
            device.getMacAddress(),
            device.getName(),
            device.getApiSecret()  // ← EXPOSE SECRET
        )
    ));
}
```

**Why**: Frontend needs the API secret to send to ESP32 via BLE.

---

**File**: `backend/src/main/java/com/biosense/iot/sensor/application/usecase/IngestSensorReadingUseCaseImpl.java`

**Change**: Enforce device ownership

```java
// ✅ VALIDATE DEVICE IS LINKED (has user_id)
public Mono<SensorReadingDomain> execute(IngestSensorReadingCommand command) {
    return sensorRepository.getLinkedDeviceId(command.getMacAddress())
        .switchIfEmpty(Mono.error(new DeviceNotFoundException("Device not found")))
        .flatMap(device -> {
            // ✅ CHECK: Device must have user_id (linked to user)
            if (device.getUserId() == null) {
                return Mono.error(new UnlinkedDeviceException(
                    "Device not linked. User must sync device first."
                ));
            }
            // ✅ VALIDATE: API Secret matches
            if (!device.getApiSecret().equals(command.getApiSecret())) {
                return Mono.error(new InvalidApiSecretException("Secret mismatch"));
            }
            // ✅ SAVE: Reading to database
            return sensorRepository.save(command);
        });
}
```

**Why**: Prevents unlinked devices from sending data. Enforces device ownership.

---

### 2️⃣ DATABASE (Second)

**File**: `backend/src/main/resources/schema.sql`

**Add**:
```sql
-- ✅ PREVENT DUPLICATE READINGS
ALTER TABLE sensor_readings
ADD CONSTRAINT unique_reading_per_device 
    UNIQUE (device_id, reading_id);

-- ✅ PERFORMANCE INDEXES
CREATE INDEX idx_readings_device_timestamp 
    ON sensor_readings(device_id, timestamp DESC);

CREATE INDEX idx_devices_user_id_mac
    ON devices(user_id, mac_address);
```

**Why**: Ensures no duplicate sensor readings are stored.

---

### 3️⃣ FRONTEND (Third)

**File**: `frontend/components/SyncDeviceModal.tsx`

**Fix**: Get apiSecret from backend response

```typescript
// ✅ WHEN USER CLICKS SYNC
async function handleSync() {
  // 1. Register device with backend
  const response = await fetch('/api/v2/devices/link', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      macAddress: selectedDevice.macAddress,
      deviceName: deviceName
    })
  });
  
  const { apiSecret } = await response.json();  // ← GET SECRET FROM BACKEND
  
  // 2. Send credentials to ESP32 via BLE
  await sendViaBLE(`${wifiSsid},${wifiPassword},${apiSecret}`);
}
```

**Why**: Frontend needs the secret to send to ESP32.

---

### 4️⃣ ESP32 FIRMWARE (Fourth)

**File**: `hardware/esp32_biosense/biosense_esp32.ino`

**Fix**: Add better error handling

```cpp
// ✅ ADD STATE ENUM
enum DeviceState {
  STATE_UNPROVISIONED,    // No WiFi saved
  STATE_PROVISIONING,     // Got credentials, restarting
  STATE_CONNECTED,        // WiFi connected
  STATE_AUTH_FAILED,      // Device not linked
  STATE_ERROR             // Failed to connect
};

// ✅ BETTER ERROR RESPONSES
int statusCode = parseHttpResponse(client);

if (statusCode == 401) {
  Serial.println("❌ Unauthorized - Device not linked to user account");
  Serial.println("   → User must sync device from app first");
  deviceState = STATE_AUTH_FAILED;
} else if (statusCode == 409) {
  Serial.println("❌ Device already linked to another account");
  deviceState = STATE_AUTH_FAILED;
} else if (statusCode >= 500) {
  Serial.println("⚠️ Server error, retrying...");
  // Exponential backoff: 1s, 2s, 4s, 8s...
  delay(1000 * pow(2, attemptCount));
}
```

**Why**: Better debugging when sync fails.

---

## ✅ Testing Checklist

### After Each Fix:

```bash
# 1. Database
psql -d biosense -c "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='sensor_readings' AND constraint_type='UNIQUE';"
# Should show: unique_reading_per_device

# 2. Backend compilation
cd backend && mvn clean compile -DskipTests
# Should succeed with no errors

# 3. Frontend build
cd frontend && npm run build
# Should succeed with no errors

# 4. End-to-end test
1. User login
2. User clicks "Sync Device"
3. Select ESP32 from BLE list
4. Enter device name
5. Enter WiFi credentials
6. Device should appear in dashboard within 10 seconds
7. Sensor readings should start flowing
```

---

## 🚨 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Device appears but no readings | Device not linked | Resync device |
| 401 Unauthorized | API Secret mismatch | Check NVS storage on ESP32 |
| 409 Conflict | Device already linked | Unlink and resync |
| 503 Service Unavailable | Backend down | Wait and retry |
| No BLE connection | BLE not enabled | Enable Bluetooth on phone |

---

## 📊 Before vs After

| Metric | Before | After |
|--------|--------|-------|
| Sync button works | ❌ No | ✅ Yes |
| Device visible | ❌ No | ✅ Yes |
| Sensor data flows | ❌ No | ✅ Yes |
| Duplicates stored | ❌ Yes | ✅ No |
| Unlinked devices can send data | ❌ Yes | ✅ No |
| API keys exposed | ❌ Yes | ✅ No |

---

## 🎯 Success Criteria (All Must Pass)

- [ ] User logs in
- [ ] User clicks "Sync Device"
- [ ] User selects ESP32 from BLE list
- [ ] User enters device name, WiFi SSID, password
- [ ] Device registration returns in < 2 seconds
- [ ] BLE write succeeds
- [ ] ESP32 connects to WiFi within 30 seconds
- [ ] First sensor reading appears in backend
- [ ] Reading stored in database (no duplicates)
- [ ] Reading visible in frontend dashboard
- [ ] No errors in backend logs
- [ ] No 401/409 errors (unless expected)
- [ ] subsequent readings continue arriving (10 second intervals)

---

## 📞 If Something Still Fails

1. **Check logs**:
   ```bash
   # Backend
   tail -f backend/logs/spring.log
   
   # ESP32 Serial Monitor
   # Open Arduino IDE → Tools → Serial Monitor (115200 baud)
   ```

2. **Check database**:
   ```sql
   -- Verify device exists
   SELECT * FROM devices WHERE mac_address = 'AA:BB:CC:DD:EE:FF';
   
   -- Verify device is linked
   SELECT * FROM devices WHERE user_id IS NOT NULL;
   
   -- Check sensor readings
   SELECT * FROM sensor_readings LIMIT 10;
   ```

3. **Check network**:
   ```bash
   # Verify backend is running
   curl http://localhost:8080/api/v2/auth/health
   
   # Verify ESP32 can reach backend
   # Check Serial output for: "✅ Reading sent successfully"
   ```

---

## 🎓 Full Documentation

For complete details, see:
- `DEVICE-SYNC-ORCHESTRATION.md` → Complete orchestration guide
- `DEVICE-SYNC-FIX-COMPLETE.md` → Full implementation details
- `.instructions.md` → Architecture rules
- `BACKEND-REACTIVE-SPECIALIST-SKILL.md` → Backend patterns
- `ESP32-IOT-SPECIALIST-SKILL.md` → Firmware patterns

---

**⏱️ Estimated Time to Fix: 4-6 hours**
- Backend: 1.5 hours
- Database: 0.5 hours
- Frontend: 1 hour
- ESP32: 1 hour
- Testing: 1 hour

**🚀 Status: READY TO IMPLEMENT**
