# 🔄 v2 SECURE vs v3 REFACTORED - Comparación Visual

## Índice Rápido
- [Loop Principal](#loop-principal)
- [WiFi Verification](#wifi-verification)
- [Sending Readings](#sending-readings)
- [State Management](#state-management)
- [BLE Handling](#ble-handling)
- [LED Feedback](#led-feedback)
- [Non-Blocking](#non-blocking-patterns)

---

## Loop Principal

### ❌ v2 SECURE

```cpp
void loop() {
  // Mixing multiple concerns in flat structure
  
  if (Serial.available()) {
    handleSerialInput();
  }
  
  if (BLE_RECONFIG_ALWAYS_AVAILABLE) {
    checkBLEData();  // Always listening, even in operational
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiReconnect();
  }
  
  if (millis() - lastReadTime > 10000) {
    readSensors();
    sendReading();  // ⚠️ No verification sendReading() succeeds
    lastReadTime = millis();
  }
  
  delay(100);  // Blocks the loop!
}
```

**Problemas:**
- ❌ No estado explícito
- ❌ BLE siempre activo
- ❌ No verificación de WiFi antes de send
- ❌ Delay bloqueante
- ❌ Difícil de debuggear

---

### ✅ v3 REFACTORED

```cpp
void loop() {
  // Clear state machine - single responsibility
  
  switch (deviceState) {
    case STATUS_UNCONFIGURED:
      handleStateUnconfigured();
      break;
      
    case STATUS_WARMUP:
      handleStateWarmup();
      break;
      
    case STATUS_OPERATIONAL:
      handleStateOperational();
      break;
  }
  
  delay(50);  // Only for watchdog timer safety
}

// Each state has explicit handler
void handleStateUnconfigured() {
  // BLE listening only
  blinkLedOrange();
  checkCredentialsReceived();
  // Transition logic
}

void handleStateWarmup() {
  // WiFi connecting + sensor warmup
  pulseLedGreen();
  tryConnectWiFi();
  warmupSensors();
  // Transition logic
}

void handleStateOperational() {
  // Normal operation
  indicateLedRisk();
  if (millis() - lastReadTime >= SENSOR_READ_INTERVAL) {
    readAndSendSensor();
    lastReadTime = millis();
  }
  // Transition logic
}
```

**Beneficios:**
- ✅ Estado explícito (3 opciones claras)
- ✅ BLE solo en UNCONFIGURED
- ✅ Responsabilidad única por función
- ✅ Fácil de debuggear
- ✅ Non-blocking architecture

---

## WiFi Verification

### ❌ v2 SECURE

```cpp
void sendReading() {
  HTTPClient http;
  http.begin(client, BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + apiSecret);
  
  String payload = "{...}";  // Variable format
  
  int httpCode = http.POST(payload);  // ⚠️ No WiFi check!
  
  if (httpCode == 201) {
    Serial.println("✅ Sent");
  } else {
    Serial.println("❌ Failed: " + String(httpCode));  // Could be UDP assert here
  }
  
  http.end();
}
```

**Problemas:**
- ❌ Assumes WiFi is connected
- ❌ No state verification
- ❌ Crashes on `assert failed: udp_new_ip_type`
- ❌ UDP layer tries resolution without proper connection

---

### ✅ v3 REFACTORED

```cpp
bool sendReading() {
  // STRICT VERIFICATION - Exit completely if WiFi not ready
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected. Skipping send.");
    return false;
  }
  
  // Only proceed with proper connection
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  http.begin(client, BACKEND_URL);
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + apiSecret);
  
  // Strict payload format
  String jsonPayload = "{";
  jsonPayload += "\"macAddress\":\"" + macAddress + "\",";
  jsonPayload += "\"readingId\":\"" + readingId + "\",";
  jsonPayload += "\"mq4\":" + String(sensorData.ch4, 2) + ",";
  jsonPayload += "\"mq7\":" + String(sensorData.co, 2) + ",";
  jsonPayload += "\"mq135\":" + String(sensorData.airQuality, 2) + ",";
  jsonPayload += "\"timestamp\":" + String(epochNow);
  jsonPayload += "}";
  
  int httpCode = http.POST(jsonPayload);
  
  bool success = (httpCode == 201);
  if (success) {
    Serial.println("✅ Reading sent successfully");
  } else {
    Serial.println("❌ HTTP error: " + String(httpCode));
  }
  
  http.end();
  return success;
}
```

**Beneficios:**
- ✅ Strict WiFi verification first
- ✅ Prevents UDP crashes
- ✅ Consistent JSON format
- ✅ Always includes Authorization
- ✅ Returns status

---

## Sending Readings

### ❌ v2 SECURE

```cpp
// Payload format inconsistent
String payload = "{"
  "\"deviceId\":\"" + deviceId + "\","  // Sometimes using deviceId
  "\"ch4\":" + String(ch4) + ","
  "\"co\":" + String(co) + ","
  "\"aq\":" + String(aq) + ","  // Sometimes abbreviated
  "\"ts\":" + String(ts)
  "}";

// May or may not include Authorization
if (apiSecret.length() > 0) {
  http.addHeader("Authorization", "Bearer " + apiSecret);
} else {
  // Send anyway? ⚠️ Silent failure possible
}

int httpCode = http.POST(payload);
```

**Problems:**
- ❌ Field names inconsistent (deviceId vs macAddress)
- ❌ Abbreviations (ch4 vs mq4, aq vs mq135)
- ❌ Authorization header optional
- ❌ No deduplication

---

### ✅ v3 REFACTORED

```cpp
// ALWAYS proper format
String jsonPayload = "{";
jsonPayload += "\"macAddress\":\"" + macAddress + "\",";  // ALWAYS macAddress
jsonPayload += "\"readingId\":\"" + readingId + "\",";     // ALWAYS readingId (for dedup)
jsonPayload += "\"mq4\":" + String(sensorData.ch4, 2) + ",";
jsonPayload += "\"mq7\":" + String(sensorData.co, 2) + ",";
jsonPayload += "\"mq135\":" + String(sensorData.airQuality, 2) + ",";
jsonPayload += "\"timestamp\":" + String(epochNow);
jsonPayload += "}";

// ALWAYS verify api_secret before send
if (apiSecret.length() == 0) {
  Serial.println("❌ No API secret. Skipping send.");
  return false;
}

// ALWAYS add Authorization
http.addHeader("Content-Type", "application/json");
http.addHeader("Authorization", "Bearer " + apiSecret);

int httpCode = http.POST(jsonPayload);
```

**Benefits:**
- ✅ Consistent field names
- ✅ Full sensor names (mq4, mq7, mq135)
- ✅ Authorization always present
- ✅ Deduplication via readingId
- ✅ Backend knows who's sending

---

## State Management

### ❌ v2 SECURE

```cpp
// Global states but no explicit enum
#define STATE_INIT 0
#define STATE_BOUND 1
#define STATE_RUNNING 2

int currentState = STATE_INIT;  // Implicit, hard to track

void setup() {
  if (credentialsExist()) {
    currentState = STATE_BOUND;
  } else {
    currentState = STATE_INIT;
  }
  // But no warmup state!
}

void loop() {
  // State logic scattered everywhere
  if (currentState == STATE_INIT) {
    // BLE listening
  }
  
  if (currentState == STATE_BOUND) {
    // WiFi connecting (same as running?)
  }
  
  if (currentState == STATE_RUNNING) {
    // Send data
  }
  
  // States can overlap, transitions unclear
}
```

**Problems:**
- ❌ No explicit enum
- ❌ Only 2 states (missing WARMUP)
- ❌ Transitions unclear
- ❌ Hard to verify state
- ❌ Easy to miss edge cases

---

### ✅ v3 REFACTORED

```cpp
// EXPLICIT state enum
enum DeviceState {
  STATUS_UNCONFIGURED = 0,  // Waiting for credentials
  STATUS_WARMUP = 1,         // WiFi + sensor warmup
  STATUS_OPERATIONAL = 2     // Normal operation
};

DeviceState deviceState = STATUS_UNCONFIGURED;

void setup() {
  if (Preferences.begin("device")) {
    if (wifiSSID.length() > 0 && apiSecret.length() > 0) {
      deviceState = STATUS_WARMUP;  // Skip UNCONFIGURED if already bound
    }
  }
}

// Explicit state transitions
void transitionToWarmup() {
  deviceState = STATUS_WARMUP;
  stateChangeTime = millis();
  deinitializeBLE();  // Free radio
  Serial.println("✅ Transitioning to WARMUP");
}

void transitionToOperational() {
  deviceState = STATUS_OPERATIONAL;
  stateChangeTime = millis();
  Serial.println("✅ Transitioning to OPERATIONAL");
}

// Each state has dedicated handler
switch (deviceState) {
  case STATUS_UNCONFIGURED:
    handleStateUnconfigured();
    break;
  case STATUS_WARMUP:
    handleStateWarmup();
    break;
  case STATUS_OPERATIONAL:
    handleStateOperational();
    break;
}
```

**Benefits:**
- ✅ Explicit enum (self-documenting)
- ✅ 3 states (covers all phases)
- ✅ Clear transitions
- ✅ Easy to verify
- ✅ Single responsibility

---

## BLE Handling

### ❌ v2 SECURE

```cpp
void initializeBLE() {
  BLEDevice::init(DEVICE_NAME);
  BLEServer* pServer = BLEDevice::createServer();
  // ... setup ...
}

void loop() {
  if (BLE_RECONFIG_ALWAYS_AVAILABLE) {
    // BLE is ALWAYS advertised and listening
    // Even after device is fully operational
  }
  
  // ⚠️ Never deinitialize BLE
  // Wastes radio resources indefinitely
}
```

**Problems:**
- ❌ BLE always active
- ❌ Radio interference with WiFi
- ❌ Power consumption
- ❌ Never cleaned up
- ❌ Potential conflicts

---

### ✅ v3 REFACTORED

```cpp
void initializeBLE() {
  if (bleInitialized) return;
  
  BLEDevice::init(DEVICE_NAME);
  BLEServer* pServer = BLEDevice::createServer();
  // ... setup ...
  
  bleInitialized = true;
  Serial.println("✅ BLE READY - Waiting for app binding...");
}

void deinitializeBLE() {
  if (!bleInitialized) return;
  
  // ✅ Explicitly deinitialize and power down
  BLEDevice::deinit(true);  // true = power down
  bleInitialized = false;
  
  Serial.println("✅ BLE Deinitialized - Radio freed for WiFi");
}

void handleStateUnconfigured() {
  // BLE active ONLY here
  if (!bleInitialized) {
    initializeBLE();
  }
  blinkLedOrange();
  
  // Check for credentials...
}

void handleStateWarmup() {
  // ✅ Call deinit() at transition
  if (bleInitialized) {
    deinitializeBLE();  // Free radio for WiFi
  }
  // ... WiFi connecting ...
}

void handleStateOperational() {
  // BLE never active
  // WiFi has full radio access
}
```

**Benefits:**
- ✅ BLE only in UNCONFIGURED
- ✅ Explicit deinit() call
- ✅ Radio freed for WiFi
- ✅ Less interference
- ✅ Power optimized

---

## LED Feedback

### ❌ v2 SECURE

```cpp
void indicateLedStatus() {
  // Very basic, hard to understand
  if (riskLevel >= 80) {
    digitalWrite(RED_LED, HIGH);
  } else if (riskLevel >= 50) {
    digitalWrite(ORANGE_LED, HIGH);
  } else {
    digitalWrite(GREEN_LED, HIGH);
  }
  
  // Only indicates risk, not state
  // Confusing for users
}
```

**Problems:**
- ❌ Only shows risk level
- ❌ Doesn't show state
- ❌ No visual feedback for "waiting"
- ❌ No visual feedback for "warming up"

---

### ✅ v3 REFACTORED

```cpp
// STATUS_UNCONFIGURED: Orange blinking (waiting for binding)
void blinkLedOrange() {
  if (millis() - lastBlinkTime >= 500) {
    lastBlinkTime = millis();
    digitalWrite(ORANGE_LED, !digitalRead(ORANGE_LED));
  }
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
}

// STATUS_WARMUP: Green pulsing (connecting/warming)
void pulseLedGreen() {
  int brightness = (int)(127.5 * (1 + sin(2 * PI * millis() / 1000)));
  analogWrite(GREEN_LED, brightness);
  digitalWrite(ORANGE_LED, LOW);
  digitalWrite(RED_LED, LOW);
}

// STATUS_OPERATIONAL: Dynamic (shows risk level)
void indicateLedRisk() {
  if (riskLevel >= 80) {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(ORANGE_LED, LOW);
    digitalWrite(GREEN_LED, LOW);
  } else if (riskLevel >= 50) {
    digitalWrite(ORANGE_LED, HIGH);
    digitalWrite(RED_LED, LOW);
    digitalWrite(GREEN_LED, LOW);
  } else {
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(ORANGE_LED, LOW);
    digitalWrite(RED_LED, LOW);
  }
}
```

**Benefits:**
- ✅ Orange blinking = "waiting for binding"
- ✅ Green pulsing = "connecting"
- ✅ Red/Orange/Green = "risk level"
- ✅ Clear visual feedback
- ✅ User understands state

---

## Non-Blocking Patterns

### ❌ v2 SECURE

```cpp
void connectToWiFi() {
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 50) {
    delay(500);  // ⚠️ BLOCKING
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected!");
  }
}

void readAndSendSensor() {
  readSensors();
  delay(100);  // ⚠️ BLOCKING
  
  sendReading();
  delay(500);  // ⚠️ BLOCKING
}

void loop() {
  // Multiple delays = ESP32 frozen
  delay(100);
  delay(500);
  delay(1000);
  // Total blocking: unpredictable, can miss events
}
```

**Problems:**
- ❌ Multiple delay() calls
- ❌ Loop freezes completely
- ❌ Can't respond to BLE interrupts
- ❌ Can't transition states instantly
- ❌ Watchdog may timeout

---

### ✅ v3 REFACTORED

```cpp
// Non-blocking WiFi connection
void tryConnectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;  // Already connected
  }
  
  if (millis() - wifiRetryTime < 5000) {
    return;  // Not time to retry yet
  }
  
  wifiRetryTime = millis();
  WiFi.begin(ssid, password);
  // ✅ Non-blocking - will continue in next loop iteration
}

// Non-blocking sensor reading
void handleStateOperational() {
  if (millis() - lastReadTime >= SENSOR_READ_INTERVAL) {
    // Only read sensors when timer expires
    readSensors();  // Quick ADC read
    sendReading();  // Non-blocking send with timeout
    lastReadTime = millis();
  }
  
  // Other state transitions can happen instantly
}

void loop() {
  switch (deviceState) {
    case STATUS_UNCONFIGURED:
      handleStateUnconfigured();
      break;
    case STATUS_WARMUP:
      handleStateWarmup();
      break;
    case STATUS_OPERATIONAL:
      handleStateOperational();
      break;
  }
  
  // Only one delay for watchdog safety
  delay(50);  // ✅ 50ms is safe, doesn't freeze
}
```

**Benefits:**
- ✅ Timer-based instead of delay()
- ✅ Loop always responsive
- ✅ Can transition states instantly
- ✅ BLE callbacks execute quickly
- ✅ Watchdog won't timeout
- ✅ Multiple tasks can run in parallel

---

## Variable Declarations

### ❌ v2 SECURE

```cpp
// Global variables scattered, unclear purpose
String wifiSSID = "";
String wifiPassword = "";
String apiSecret = "";
String deviceId = "";
String macAddress = "";

float ch4 = 0;
float co = 0;
float aq = 0;

int lastReadTime = 0;
int lastBlinkTime = 0;
int lastNTPTime = 0;

// State tracking unclear
int currentState = 0;
bool wifiConnected = false;
bool bleInitialized = false;

// No consistency
```

---

### ✅ v3 REFACTORED

```cpp
// Organized by purpose

// ===== CONFIGURATION =====
const String DEVICE_NAME = "BioSense-ESP32";
const String BACKEND_URL = "https://railway-backend.com/api/v2/sensors/reading";
const char* NTP_SERVER = "pool.ntp.org";
const int SENSOR_READ_INTERVAL = 10000;     // 10 seconds
const int WARMUP_DURATION = 30000;          // 30 seconds

// ===== CREDENTIALS & IDENTITY =====
String wifiSSID = "";
String wifiPassword = "";
String apiSecret = "";
String macAddress = "";

// ===== STATE =====
enum DeviceState {
  STATUS_UNCONFIGURED = 0,
  STATUS_WARMUP = 1,
  STATUS_OPERATIONAL = 2
};
DeviceState deviceState = STATUS_UNCONFIGURED;

// ===== SENSOR DATA =====
struct SensorData {
  float ch4;          // PPM
  float co;           // PPM
  float airQuality;   // PPM
  time_t timestamp;
} sensorData;

// ===== TIMERS (non-blocking) =====
unsigned long lastReadTime = 0;
unsigned long lastBlinkTime = 0;
unsigned long stateChangeTime = 0;
unsigned long wifiRetryTime = 0;

// ===== LED STATES =====
bool redLedOn = false;
bool orangeLedOn = false;
bool greenLedOn = false;

// ===== FLAGS =====
bool bleInitialized = false;
bool wifiConnected = false;

// Clarity and organization
```

---

## HTTP Request Comparison

### ❌ v2 SECURE

```cpp
// Inconsistent format sent
POST /api/v2/sensors/reading
Content-Type: application/json
Authorization: Bearer xyz789

{
  "deviceId": "FF:AA:BB:CC:DD:EE",    // Sometimes this
  "ch4": 150.25,                      // Abbreviated field names
  "co": 8.50,
  "aq": 420.10,
  "ts": 1234567890                    // Abbreviated timestamp field
}

// Or sometimes:
{
  "macAddress": "FF:AA:BB:CC:DD:EE",  // Or this
  "mq4": 150.25,
  "mq7": 8.50,
  "mq135": 420.10,
  "timestamp": 1234567890
}

// Backend confused - which format?
// Response: 400 Bad Request
```

---

### ✅ v3 REFACTORED

```cpp
// ALWAYS consistent format
POST /api/v2/sensors/reading
Content-Type: application/json
Authorization: Bearer xyz789

{
  "macAddress": "FF:AA:BB:CC:DD:EE",  // ✅ ALWAYS full field name
  "readingId": "FF:AA:BB:CC:DD:EE-1234567890-a1b2c3d4",  // ✅ For deduplication
  "mq4": 150.25,                       // ✅ Full sensor name
  "mq7": 8.50,
  "mq135": 420.10,
  "timestamp": 1234567890              // ✅ Full field name
}

// Backend always recognizes format
// Response: 201 Created
// Data inserted into database
```

---

## Summary Table

| Aspect | v2 SECURE | v3 REFACTORED |
|--------|-----------|---------------|
| **State Management** | 2 implicit states | 3 explicit states |
| **WiFi Stability** | Crashes (UDP assert) | Strict verification |
| **BLE Lifecycle** | Always active | Active only when needed |
| **Code Structure** | Flat, hard to follow | State machine (clear) |
| **Payload Format** | Inconsistent | Consistent |
| **Authorization** | Optional | Always present |
| **Non-Blocking** | Partial (many delays) | Complete (millis timers) |
| **LED Feedback** | Risk only | State + Risk |
| **Debugging** | Difficult (mixed concerns) | Easy (clear states) |
| **Production Ready** | No | Yes |

---

## Key Learnings

### 1. State Machines Clarify Logic
- v2: "What state am I in?" = Guess based on context
- v3: "What state am I in?" = Check enum value

### 2. Explicit Transitions Enable Debugging
- v2: State changes scattered throughout code
- v3: State changes are function calls with logging

### 3. Non-Blocking Design is Essential
- v2: Multiple delay() = frozen device
- v3: Timer-based = always responsive

### 4. Resource Cleanup Matters
- v2: BLE active forever = interference
- v3: BLE deinit() = radio freed for WiFi

### 5. Consistent Payloads Prevent Silent Failures
- v2: Backend guesses format = 400 errors
- v3: Strict format = backend always works

---

**Conclusion:** v3 is not just a bug fix—it's a complete architecture upgrade
from procedural code to a clear, maintainable, production-ready state machine.

