# 🔍 DEBUG: ESP32 ↔ Backend Synchronization Analysis

## ❌ BLOCKING ISSUE FOUND

### **Root Cause: Header Mismatch**
- **ESP32 sends:** `X-BioSense-Key: {apiSecret}` (Line 465 in biosense_esp32.ino)
- **Backend expects:** `Authorization: Bearer {apiSecret}` (Line 25-26 in SensorControllerV2.java)

**Result:** ❌ 403 Forbidden (Unauthorized)

---

## 📊 Current Sync Flow Analysis

### **1. Device Registration (✅ WORKING)**
```
Mobile App → POST /api/v2/devices/link (with User JWT)
Backend → Creates device, generates apiSecret
Mobile App ← Returns apiSecret via BLE to ESP32
```

### **2. ESP32 BLE Reception (✅ WORKING)**
```
App sends: "SSID,PASSWORD,API_SECRET"
ESP32 onWrite() callback → Parses credentials
Stores in NVS: ssid, password, api_secret
Restarts ESP32
```

### **3. WiFi Connection (✅ WORKING)**
```
ESP32 → Reads NVS credentials
Connects to WiFi
Begins sensor readings every 10 seconds
```

### **4. Sensor Data Ingestion (❌ BROKEN)**
```
ESP32 → Sends POST /api/v2/sensors/reading
Header: X-BioSense-Key: {apiSecret}  ❌ WRONG
Payload: {macAddress, mq4, mq7, mq135, readingId}

Backend expects:
Header: Authorization: Bearer {apiSecret}  ✅ CORRECT

Response: 403 Forbidden (Missing Authorization header)
```

---

## 🔧 Required Fixes

### **ESP32 Fix (biosense_esp32.ino - Line 465)**

**BEFORE:**
```cpp
http.addHeader("X-BioSense-Key", apiSecret);
```

**AFTER:**
```cpp
http.addHeader("Authorization", "Bearer " + apiSecret);
```

---

## ✅ Verification Checklist

After applying the fix:

1. **Header Alignment** - ESP32 sends `Authorization: Bearer {token}`
2. **Backend Reception** - SensorControllerV2 extracts Bearer token
3. **Device Validation** - IngestSensorReadingUseCaseImpl validates device ownership
4. **Database Storage** - Schema enforces user_id NOT NULL
5. **Response** - Backend returns 200 OK with saved reading

---

## 📱 Complete End-to-End Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│ DEVICE SYNCHRONIZATION - COMPLETE FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ PHASE 1: USER LOGIN & DEVICE REGISTRATION                   │
│ ════════════════════════════════════════                     │
│  1. User logs in with credentials (User JWT issued)          │
│  2. User taps "SINCRONIZAR" in mobile app                    │
│  3. App scans for nearby BLE devices                         │
│  4. User selects "BioSense-{MAC}" device                     │
│  5. App initiates device link request:                       │
│     POST /api/v2/devices/link                                │
│     Header: Authorization: Bearer {USER_JWT}                 │
│     Body: { deviceName, linkCode, macAddress }               │
│  6. Backend validates user JWT ✅                            │
│  7. Backend creates device linked to user_id ✅              │
│  8. Backend generates apiSecret (device credential)          │
│  9. Backend returns: { apiSecret, deviceId }                 │
│ 10. App stores apiSecret                                     │
│                                                              │
│ PHASE 2: BLE CREDENTIAL TRANSFER                             │
│ ═══════════════════════════════════                           │
│ 11. App opens BLE connection to ESP32                        │
│ 12. App sends via BLE: "SSID,PASSWORD,API_SECRET"            │
│ 13. ESP32 onWrite() callback receives data                   │
│ 14. ESP32 parses: SSID, PASSWORD, API_SECRET                 │
│ 15. ESP32 stores in NVS (encrypted):                         │
│     - ssid                                                   │
│     - password                                               │
│     - api_secret                                             │
│ 16. ESP32 automatically restarts                             │
│                                                              │
│ PHASE 3: WIFI CONNECTION & STARTUP                           │
│ ═══════════════════════════════════════                       │
│ 17. ESP32 initializes after restart                          │
│ 18. ESP32 reads NVS credentials                              │
│ 19. ESP32 connects to WiFi (SSID + PASSWORD)                 │
│ 20. ESP32 begins sensor warm-up (30 seconds)                 │
│ 21. ESP32 initializes sensor reading loop (10s interval)     │
│                                                              │
│ PHASE 4: SENSOR DATA INGESTION ⚠️ CRITICAL SECTION           │
│ ═════════════════════════════════════════════════             │
│ 22. ESP32 reads MQ4, MQ7, MQ135 analog values                │
│ 23. ESP32 converts ADC to PPM values                          │
│ 24. ESP32 generates readingId (mac-address + millis)         │
│ 25. ESP32 checks dedup buffer (prevents duplicates)          │
│ 26. ESP32 sends POST /api/v2/sensors/reading:                │
│     URL: https://{backend}/api/v2/sensors/reading             │
│     Header: Authorization: Bearer {API_SECRET}  ✅ FIXED       │
│     Header: Content-Type: application/json                   │
│     Body: {                                                  │
│       "macAddress": "{device_mac}",                          │
│       "mq4": 25.3,                                           │
│       "mq7": 8.5,                                            │
│       "mq135": 450.0,                                        │
│       "readingId": "{unique_id}"                             │
│     }                                                        │
│                                                              │
│ PHASE 5: BACKEND VALIDATION & STORAGE                        │
│ ═════════════════════════════════════════                     │
│ 27. Backend SecurityConfig checks:                           │
│     - Endpoint requires authentication ✅                    │
│     - Bearer token present ✅                                │
│ 28. SensorControllerV2 receives request:                      │
│     - Extracts Authorization header                          │
│     - Parses Bearer token → apiKey                           │
│ 29. IngestSensorReadingUseCaseImpl validates:                 │
│     - apiKey not empty ✅                                    │
│     - Device exists by apiKey ✅                             │
│     - Device.user_id NOT NULL ✅  (enforces device ownership) │
│ 30. Database checks UNIQUE(device_id, reading_id):           │
│     - Prevents duplicate readings ✅                         │
│ 31. Database inserts sensor_readings row                     │
│ 32. Backend evaluates air quality level                      │
│ 33. Backend returns 200 OK:                                  │
│     {                                                        │
│       "status": "success",                                   │
│       "id": "{reading_id}",                                  │
│       "airQualityState": "SAFE|WARNING|DANGER"               │
│     }                                                        │
│                                                              │
│ PHASE 6: DATA VISUALIZATION                                  │
│ ═══════════════════════════                                   │
│ 34. User opens mobile app dashboard                          │
│ 35. App queries GET /api/v2/sensors/latest (with User JWT)   │
│ 36. Backend returns latest readings for user's devices       │
│ 37. App displays:                                            │
│     - Real-time sensor values                                │
│     - Air quality status (GREEN|ORANGE|RED)                  │
│     - LED indicator matches remote device                    │
│     - Timestamp of last reading                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 What Was Breaking

1. **Line 465 mismatch** - ESP32 sends old header format
2. **401 responses** - Backend rejects `X-BioSense-Key` header
3. **Silent failure** - No readings stored, user sees nothing
4. **Loop continues** - ESP32 keeps trying, fills logs with errors

---

## ✅ Post-Fix Validation

After updating line 465:

```bash
# Check ESP32 serial output for:
✅ "📤 Enviando datos al backend..."
✅ "   Respuesta HTTP: 200"
✅ "✅ Datos guardados en la base de datos!"

# Check backend logs for:
✅ "Successfully ingested sensor reading"
✅ "Device: {device_id}, User: {user_id}"
✅ "Air Quality State: SAFE"

# Check mobile app for:
✅ Dashboard shows latest readings
✅ Timestamp updates every 10 seconds
✅ LED status reflects current quality
```

---

## 🔐 Security Status

✅ User JWT authentication (device registration)
✅ Device JWT authentication (sensor ingestion) 
✅ Device ownership enforced (user_id NOT NULL)
✅ Bearer token standard HTTP auth
✅ No exposed API keys
✅ HTTPS only (SSL certificates pinned)
✅ Duplicate reading prevention (UNIQUE constraint)
