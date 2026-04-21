# E2E Validation Checklist: ESP32 → Backend → Database → Frontend

**Objective:** Verify real sensor data flow without mocks across the complete IoT stack.

**Prerequisites:**
- PostgreSQL running and accessible (✓ confirmed from logs)
- Backend deployed and running on `https://biosenseiot-production-e061.up.railway.app`
- Frontend app running locally or deployed
- ESP32 with secure firmware flashed and BLE active
- User authenticated in frontend

---

## Phase 1: Device Linking

### Step 1.1: Add Device to Backend Database
```sql
-- Connect to your PostgreSQL instance
INSERT INTO devices (mac_address, device_name, created_at, updated_at)
VALUES ('AA:BB:CC:DD:EE:FF', 'Test-Sensor-1', NOW(), NOW())
ON CONFLICT (mac_address) DO NOTHING
RETURNING id;
```
**Note:** Replace `AA:BB:CC:DD:EE:FF` with actual ESP32 MAC. Query should return device `id` (e.g., `1`).

### Step 1.2: Link Device to User
```sql
-- Get your user_id (if not known, list all users first)
SELECT id FROM users LIMIT 1;

-- Link device to user (assuming device_id=1, user_id=1)
INSERT INTO user_devices (user_id, device_id, linked_at)
VALUES (1, 1, NOW())
ON CONFLICT (user_id, device_id) DO NOTHING;
```

### Step 1.3: Generate API Secret
```sql
-- Update device with auto-generated secret (or manual for testing)
UPDATE devices 
SET api_secret = 'test-secret-12345'
WHERE id = 1;
```

### Step 1.4: Verify Device Link in Frontend
- Open Frontend → Devices page
- Should see "Test-Sensor-1" in linked devices
- Device status should reflect `last_seen` timestamp (initially NULL or old)

**Expected Outcome:** Device appears as "OFFLINE" (no readings yet).

---

## Phase 2: ESP32 Firmware Configuration

### Step 2.1: Provision ESP32 via BLE
1. Open BLE scanner app on phone (e.g., "nRF Connect" or "BLE Scanner")
2. Look for device named `BioSense-XXXX` (last 5 chars of MAC)
3. Connect and write to characteristic:
   ```
   YOUR_SSID,YOUR_PASSWORD,test-secret-12345
   ```
4. ESP32 will restart and connect to WiFi
5. Serial monitor should show:
   ```
   ✅ WiFi conectado exitosamente!
   🕒 Clock synced (epoch=1713...)
   ```

### Step 2.2: Verify ESP32 Serial Output
Monitor serial console after WiFi connects:
```
📊 CH4=45.3 | CO=12.5 | Air=234.1 | OK=1
📤 POST #1: 200
↩️ {"id": 15, "deviceId": "AA:BB:CC:DD:EE:FF", ...}
✅ Success
```

**Indicators of Success:**
- `POST` returns `200` or `201` (or `409` if duplicate)
- Response body contains `"id": <number>`
- No `401` or `403` auth errors

---

## Phase 3: Database Persistence

### Step 3.1: Verify Sensor Reading Inserted
```sql
-- Check for new readings within last 5 minutes
SELECT id, device_id, mq4_value, mq7_value, mq135_value, timestamp 
FROM sensor_readings
WHERE device_id = 1
ORDER BY timestamp DESC
LIMIT 5;
```

**Expected Result:**
- Row(s) with recent timestamps
- MQ values > 0 (e.g., CH4=45.3, CO=12.5, Air=234.1)
- `id` should be auto-incremented

### Step 3.2: Verify Diagnostic Generated
```sql
-- Check for auto-generated diagnostics
SELECT id, sensor_reading_id, severity, text, recommendation, created_at
FROM ai_diagnostics
WHERE sensor_reading_id = (
    SELECT id FROM sensor_readings 
    WHERE device_id = 1 
    ORDER BY timestamp DESC LIMIT 1
);
```

**Expected Result:**
- Severity is one of: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- Text contains thresholds (e.g., "CO: 12.5 ppm")
- Recommendation is contextual (e.g., "Mejore la ventilación")

### Step 3.3: Verify Device `last_seen` Updated
```sql
-- Check that last_seen timestamp was refreshed after ingestion
SELECT id, mac_address, last_seen 
FROM devices 
WHERE id = 1;
```

**Expected Result:**
- `last_seen` should be very recent (within last minute)
- Timestamp should update with each new reading

---

## Phase 4: Frontend Dashboard Verification

### Step 4.1: Check Real Data in Dashboard
1. Navigate to Frontend Dashboard
2. Verify that:
   - **Sensor Cards** show real MQ values (not "N/A" or hardcoded mocks)
   - **AQI Gauge** animates to correct level based on MQ135
   - **Device Status** shows "ONLINE" or with recent timestamp
   - **Alert Cards** display severity and recommendations from DB

### Step 4.2: Verify No Mock Fallback
- Open Browser DevTools → Network tab
- Click on `/api/v2/diagnostics/latest` request
- Response should contain real `mq4`, `mq7`, `mq135` values
- **NOT** empty/null or placeholder values

### Step 4.3: Test Poll Refresh
- Wait 10+ seconds (ESP32 sends every 10 seconds)
- Dashboard should auto-refresh with new readings
- Timestamp should advance
- Values should change slightly (sensor variation is normal)

---

## Phase 5: End-to-End Flow Verification

### Step 5.1: Monitor Complete Cycle
Repeat the following 3 times and log results:

**Cycle 1 - Initial Reading:**
1. ESP32 sends reading → log timestamp from serial
2. Check `sensor_readings` for new row
3. Verify `ai_diagnostics` generated
4. Confirm frontend updates within 2 seconds

**Cycle 2 - Duplicate Detection:**
1. Trigger same reading ID (verify dedup logic)
2. Expect `409 Conflict` or successful no-op
3. No duplicate rows in `sensor_readings`

**Cycle 3 - Threshold Alert:**
1. Modify calibration to simulate high CO (>200 ppm)
2. Expect severity `HIGH` or `CRITICAL` in diagnostics
3. Dashboard alert card should display warning emoji/color

### Step 5.2: Failure Recovery
1. Disconnect ESP32 WiFi (simulate network outage)
2. Verify retry logic in serial output (should see 3 attempts)
3. Reconnect WiFi
4. Verify reading eventually sends successfully
5. No duplicate rows after reconnection

---

## Phase 6: Security Validation

### Step 6.1: Verify API Secret Authentication
```bash
# Test with WRONG secret (should fail)
curl -X POST https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"AA:BB:CC:DD:EE:FF","mq7":10,"mq4":5,"mq135":100}'

# Expected: 401 Unauthorized
```

### Step 6.2: Verify JWT for User Endpoints
```bash
# Test /diagnostics/latest without JWT (should fail)
curl -X GET https://biosenseiot-production-e061.up.railway.app/api/v2/diagnostics/latest

# Expected: 401 Unauthorized
```

### Step 6.3: Verify Sensor Ingest Bypasses JWT
```bash
# Test /api/v2/sensors/reading with correct Bearer (should work)
curl -X POST https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading \
  -H "Authorization: Bearer test-secret-12345" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"AA:BB:CC:DD:EE:FF","readingId":"unique-id-123","mq7":10,"mq4":5,"mq135":100}'

# Expected: 200 OK or 409 Conflict (if duplicate)
```

---

## Troubleshooting

### Issue: ESP32 can't connect to WiFi
- Check SSID/password provisioned via BLE
- Verify WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- Check signal strength in serial: `RSSI: -XX dBm` (better if closer to 0)

### Issue: POST returns 401/403
- Verify API secret matches in DB: `SELECT api_secret FROM devices WHERE id=1;`
- Check Authorization header format: must be `Bearer <secret>` (not `Basic`)
- Verify device is linked: `SELECT * FROM user_devices WHERE device_id=1;`

### Issue: Reading not appearing in DB
- Check ESP32 serial for HTTP response code
- If `409`: duplicate reading (expected behavior, check `reading_id` uniqueness)
- If `400/500`: check JSON payload format matches schema
- Enable debug logs in backend: `logging.level.com.biosense=DEBUG`

### Issue: Diagnostic not generated
- Check device linked to user: `SELECT * FROM user_devices WHERE device_id=1;`
- If not linked, diagnostic won't generate (by design)
- Check AI diagnostic use case runs after save

### Issue: Frontend shows "N/A" or old data
- Verify JWT token in browser localStorage: `AuthService.getToken()`
- Check network tab for `/diagnostics/latest` request/response
- Clear browser cache and reload
- Verify `use-sensor-data` hook is not returning mock fallback

---

## Success Criteria

✅ **All Phases Complete When:**
1. New reading inserted in `sensor_readings` table automatically
2. Diagnostic severity/text auto-generated in `ai_diagnostics`
3. Device `last_seen` updated with each reading
4. Frontend dashboard displays real MQ values (not mocks)
5. No 401/403 errors on sensor ingest endpoint
6. JWT still protects user endpoints (`/diagnostics`, `/devices`)
7. Duplicate readings blocked via `ON CONFLICT` + `reading_id`

---

## Summary SQL Query for Quick Verification

Run this to see all recent activity for device_id=1:

```sql
-- Recent readings + diagnostics
SELECT 
    sr.id as reading_id,
    sr.timestamp,
    sr.mq4_value, sr.mq7_value, sr.mq135_value,
    ad.severity,
    ad.text,
    d.last_seen
FROM sensor_readings sr
LEFT JOIN ai_diagnostics ad ON ad.sensor_reading_id = sr.id
CROSS JOIN devices d
WHERE sr.device_id = 1 AND d.id = 1
ORDER BY sr.timestamp DESC
LIMIT 10;
```

**Expected Output:**
```
reading_id | timestamp           | mq4_value | mq7_value | mq135_value | severity | text                        | last_seen
-----------+---------------------+-----------+-----------+-------------+----------+-----------------------------+---------------------
15         | 2026-04-21 20:58:00 | 45.3      | 12.5      | 234.1       | LOW      | Calidad del aire aceptable  | 2026-04-21 20:58:00
14         | 2026-04-21 20:57:50 | 44.8      | 11.8      | 230.5       | LOW      | Calidad del aire aceptable  | 2026-04-21 20:57:50
```

---

**Next Step:** Follow Phase 1-6 in order and report results. Each phase validates a specific layer of the stack.
