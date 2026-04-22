# ✅ BIOSENSE v3 - VALIDATION CHECKLIST (1-PAGE QUICK REFERENCE)

Print this page or save to desktop for quick validation

---

## 🔧 PRE-COMPILATION CHECKLIST

```
[ ] Arduino IDE v2.0+
[ ] ESP32 Core installed (Boards Manager)
[ ] CH340 driver installed
[ ] ESP32 connected via USB-C
[ ] Port detected (Tools → Port → COM3)
[ ] File open: biosense_esp32_REFACTORED.ino
```

---

## ⚙️ ARDUINO IDE SETTINGS

```
Board:              ESP32 Dev Module
Port:               COM3 (your port)
Upload Speed:       921600
Flash Frequency:    80 MHz
Flash Mode:         DIO
Partition Scheme:   Default 4MB with spiffs
```

**Verify:** ✓ Ctrl+R → "Compilation complete"

---

## 📤 UPLOAD & MONITOR

```
[ ] Sketch → Upload (Ctrl+U)
[ ] Wait for: "Hash of data verified"
[ ] Tools → Serial Monitor (Ctrl+Shift+M)
[ ] Baud Rate: 115200
```

---

## 🎯 STATE VALIDATION (Watch Serial Monitor)

### ✅ TEST 1: UNCONFIGURED (No API Secret)
```
Expected Logs:
├─ 🔥 BIOSENSE IoT v3 - REFACTORED
├─ 📍 MAC: FF:AA:BB:CC:DD:EE
├─ ❌ Device not bound. Entering UNCONFIGURED mode.
├─ 📡 INITIALIZING BLE
├─ ✅ BLE READY - Waiting for app binding...
└─ [LED ORANGE BLINKING every 500ms]

PASS: ✓ BLE visible in Android Bluetooth scan
FAIL: ✗ No logs appearing → Check Baud 115200
```

---

### ✅ TEST 2: AFTER BLE BINDING
```
Expected Logs:
├─ 📥 BLE DATA RECEIVED: SSID,PASSWORD,API_SECRET
├─ ✅ CREDENTIALS SAVED TO NVS
├─ 🔄 RESTARTING IN 2 SECONDS...
└─ [ESP32 auto-restarts]

Then:
├─ ✅ Device bound. Entering WARMUP mode.
├─ 📶 Connecting to WiFi...
└─ [LED GREEN PULSING]

PASS: ✓ Transitions to WARMUP automatically
FAIL: ✗ Stays in UNCONFIGURED → Check BLE sending SSID,PASS,SECRET
```

---

### ✅ TEST 3: WARMUP (30 seconds)
```
Expected Logs:
├─ ✅ WiFi connected
├─ ✅ Clock synced (epoch=1713791138)
├─ ⏳ Warmup: 25s remaining
├─ ⏳ Warmup: 20s remaining
├─ ... (countdown to 0)
└─ ✅ WARMUP COMPLETE - ENTERING OPERATIONAL MODE

PASS: ✓ Exactly 30 seconds
FAIL: ✗ WiFi timeout (20s) → Restart → Check WiFi credentials
FAIL: ✗ Stays in WARMUP → Check time passing
```

---

### ✅ TEST 4: OPERATIONAL (Live Sensor Data)
```
Expected Every 10 Seconds:
├─ 📊 SENSOR DATA: CH4=150.25 | CO=8.50 | Air=420.10
├─ 📤 Sending to backend...
├─ 🔗 URL: https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading
├─ 📄 Payload: {"macAddress":"FF:AA:BB:CC:DD:EE","readingId":"...","mq4":150.25,...}
├─ 📬 Response: 201
└─ ✅ Reading sent successfully

LED Status:
├─ 🟢 GREEN   = SAFE (CO < 9 ppm)
├─ 🟠 ORANGE  = WARNING (CO 9-30 ppm)
└─ 🔴 RED     = DANGER (CO > 30 ppm)

PASS: ✓ Logs appear every 10 seconds
PASS: ✓ HTTP 201 responses
FAIL: ✗ No logs → Check WiFi connectivity
FAIL: ✗ HTTP 403 → Invalid API Secret
FAIL: ✗ HTTP -1 → Network unreachable
```

---

### ✅ TEST 5: WiFi LOSS RECOVERY
```
1. Turn off WiFi router (or disconnect manually)
   Wait 5-10 seconds...

Expected Logs:
├─ ❌ WiFi lost. Returning to WARMUP...
├─ [LED turns OFF]
└─ [Attempts to reconnect]

2. Turn WiFi back ON
   Wait 10-15 seconds...

Expected Logs:
├─ 📶 Connecting to WiFi...
├─ ✅ WiFi connected
└─ ✅ WARMUP COMPLETE - ENTERING OPERATIONAL MODE

PASS: ✓ Recovers and returns to OPERATIONAL
FAIL: ✗ Restarts instead of reconnecting → Check WiFi settings
```

---

## 📊 BACKEND VALIDATION

In Railway logs, search for:
```
GET /api/v2/sensors/reading HTTP/1.1
Authorization: Bearer [api_secret]

Expected:
├─ Status: 201 ✓
├─ macAddress: FF:AA:BB:CC:DD:EE
├─ readingId: FF:AA:BB:CC:DD:EE-1713791138-0x1A2B
├─ mq4: 150.25 (CH4)
├─ mq7: 8.50 (CO)
├─ mq135: 420.10 (Air Quality)
└─ timestamp: 1713791138 (Unix epoch)

PASS: ✓ Readings in database
FAIL: ✗ 404 errors → Endpoint not registered
FAIL: ✗ 401 errors → Auth header missing or wrong
```

---

## 🐛 QUICK TROUBLESHOOTING

| Issue | Cause | Fix |
|-------|-------|-----|
| `Port COM3 not found` | USB driver missing | Install CH340 driver |
| `Compilation error` | Code corrupted | Copy biosense_esp32_REFACTORED.ino again |
| `Serial shows garbage` | Wrong Baud | Set to 115200 |
| `LED not blinking` | GPIO pins mismatched | Check GPIO 25, 26, 27 |
| `BLE not visible` | BLE not initialized | Should auto-init in UNCONFIGURED |
| `WiFi timeout` | Wrong SSID/password | Verify in BLE string |
| `HTTP 403` | Invalid API secret | Re-bind via BLE with correct secret |
| `WiFi connects but no data` | WiFi drops after warmup | Check WiFi signal strength |
| `Sensor shows 0 PPM` | ADC pins not reading | Check GPIO 34, 35, 32 connections |

---

## 📱 BLE BINDING STEPS (Reference)

```
1. Open BioSense app → "MI PERFIL"
2. Tap "SINCRONIZAR"
3. Tap "Escanear Bluetooth"
4. Select "BioSense-XXXX"
5. Enter format: SSID,PASSWORD,API_SECRET
   Example: MyNetwork,mypassword123,abc123def456
6. Tap "VINCULAR"
7. Wait 2 seconds (auto-restart)
8. Serial Monitor: ✅ Device bound...
```

---

## ✨ FINAL CHECKLIST

```
STATE:              ✓ UNCONFIGURED → ✓ WARMUP → ✓ OPERATIONAL
LED Indicator:      ✓ Orange blink → ✓ Green pulse → ✓ Green/Orange/Red
BLE:                ✓ Active → ✓ Deinitialized
WiFi:               ✗ None → ✓ Connected → ✓ Verified
Sensors:            ✗ Off → ✗ Warming → ✓ Reading
Backend:            ✗ None → ✗ None → ✓ 201 responses
Deduplication:      ✗ None → ✗ None → ✓ readingId unique
Authorization:      ✗ None → ✗ None → ✓ Bearer [secret]

OVERALL STATUS: [ ] READY FOR PRODUCTION
```

---

## 📌 NEXT STEPS

- [ ] Validate all 5 tests pass
- [ ] Check Backend logs for readings
- [ ] Monitor for 1 hour (check WiFi stability)
- [ ] Test WiFi loss recovery
- [ ] Archive this checklist
- [ ] Document any custom changes
- [ ] Set up monitoring alerts in Railway

---

**Print this page. Use it as a checklist during validation. Share with team.**

*Created: 2026-04-21 | v3 Refactored Firmware*
