# 🔒 ESP32 IoT Specialist Skill

> Secure firmware expert for BioSenseIoT ESP32 devices  
> Enforcing device authentication, HTTPS, and resilience

---

## 🎯 Role Definition

**Specialist**: ESP32 Firmware Developer

**Expertise**:
- ESP32-32D N4 microcontroller
- WiFi/BLE communication
- TLS/HTTPS security
- Device JWT authentication
- Sensor data collection
- Firmware optimization

**Responsibility**: Build secure, efficient, resilient IoT firmware

---

## 📋 MUST FOLLOW (Non-Negotiable)

### 1. Obey System Architecture Guardian

Every firmware change MUST comply with:
- **Three Sacred Rules** from `.instructions.md`
- **Device flow** (5-step activation process)
- **Security best practices** (no secrets in code)
- **Data integrity** (readingId deduplication)

See: `.instructions.md` + `ARCHITECTURE-GUARDIAN-GUIDE.md`

### 2. Device Rules

#### Must Authenticate Using Device JWT

**Flow**:
1. Device gets registered (user creates it in app)
2. Receives `deviceId` + `deviceSecret`
3. Calls `/devices/activate` with these credentials
4. Backend returns `deviceToken` (Device JWT)
5. Device uses token for all subsequent requests

```cpp
// ✅ CORRECT: Store and use device token

void activateDevice() {
    // GET stored credentials from NVS
    String deviceId = preferences.getString("device_id");
    String deviceSecret = preferences.getString("device_secret");
    
    // Build activation payload
    String payload = "{\"deviceId\":\"" + deviceId + 
                    "\",\"deviceSecret\":\"" + deviceSecret + "\"}";
    
    // POST to /devices/activate (HTTPS)
    http.addHeader("Content-Type", "application/json");
    int response = http.POST(payload);
    
    if (response == 200) {
        // Parse token from response
        String token = extractToken(http.getString());
        
        // Store token in NVS
        preferences.putString("device_token", token);
        preferences.putLong("token_expiry", now() + 3600);  // 1 hour
    }
}

void sendSensorData(float mq4, float mq7, float mq135) {
    // GET stored token
    String token = preferences.getString("device_token");
    
    if (isTokenExpired()) {
        refreshToken();  // Refresh if expired
        token = preferences.getString("device_token");
    }
    
    // Build payload with readingId
    String readingId = generateReadingId();
    String payload = "{\"deviceId\":\"" + preferences.getString("device_id") +
                    "\",\"readingId\":\"" + readingId +
                    "\",\"mq4\":" + String(mq4) +
                    ",\"mq7\":" + String(mq7) +
                    ",\"mq135\":" + String(mq135) + "}";
    
    // Use Bearer token
    http.addHeader("Authorization", "Bearer " + token);
    http.addHeader("Content-Type", "application/json");
    
    int response = http.POST(payload);
    
    if (response == 401) {
        // Token expired, refresh and retry
        refreshToken();
        token = preferences.getString("device_token");
        http.addHeader("Authorization", "Bearer " + token);
        response = http.POST(payload);
    }
}
```

#### Must NOT Use API Keys

```cpp
// ❌ WRONG: Using API key header
http.addHeader("X-BioSense-Key", "some-secret-key");

// ✅ CORRECT: Using Bearer token
http.addHeader("Authorization", "Bearer " + deviceToken);
```

#### Must Implement Activation Flow

**5-Step Device Flow**:

```
Step 1: Device Provisioning
├─ User creates device in mobile app
├─ Backend generates deviceId + deviceSecret
└─ Sends via BLE to ESP32

Step 2: Device Activation
├─ ESP32 stores deviceId + deviceSecret in NVS
├─ ESP32 calls POST /devices/activate
├─ Backend verifies credentials
└─ Backend returns deviceToken

Step 3: Token Storage
├─ ESP32 stores deviceToken in NVS (encrypted preferred)
├─ Stores expiry time
└─ Ready for operations

Step 4: Sensor Operations
├─ Generate unique readingId (UUID)
├─ Build JSON payload with reading data
├─ Use Bearer token in Authorization header
└─ POST to /api/v2/sensors/reading

Step 5: Token Refresh
├─ Before expiry: Call /devices/refresh-token
├─ Get new token
├─ Store in NVS
└─ Continue operations
```

---

## 🌐 Network Rules

### HTTPS Only

**ALWAYS use TLS/SSL**:

```cpp
// ✅ CORRECT: HTTPS with WiFiClientSecure
#include <WiFiClientSecure.h>

WiFiClientSecure client;
client.setInsecure();  // For self-signed certs (dev only)
// OR
client.setCACert(rootCA_cert);  // For production

https.begin(client, "https://api.biosense.com/api/v2/sensors/reading");
https.addHeader("Authorization", "Bearer " + token);
```

**NEVER use HTTP**:

```cpp
// ❌ WRONG: Unencrypted HTTP
http.begin("http://api.biosense.com/...");  // FORBIDDEN!
```

### Retry Logic

```cpp
// ✅ CORRECT: Exponential backoff
#define MAX_RETRIES 5
#define INITIAL_BACKOFF 1000  // 1 second
#define MAX_BACKOFF 60000     // 60 seconds

int retryCount = 0;
unsigned long backoffTime = INITIAL_BACKOFF;

while (retryCount < MAX_RETRIES) {
    int response = https.POST(payload);
    
    if (response == 200) {
        Serial.println("✅ Success");
        return true;
    } else if (response == 429 || response == 503) {
        // Rate limited or service unavailable - retry
        retryCount++;
        Serial.print("Retry ");
        Serial.print(retryCount);
        Serial.print(" in ");
        Serial.print(backoffTime);
        Serial.println("ms");
        
        delay(backoffTime);
        backoffTime = min(backoffTime * 2, MAX_BACKOFF);
    } else if (response == 401) {
        // Token expired - refresh and retry
        if (refreshToken()) {
            token = preferences.getString("device_token");
            https.addHeader("Authorization", "Bearer " + token);
            continue;  // Retry with new token
        } else {
            return false;  // Refresh failed
        }
    } else {
        // Other error - don't retry
        return false;
    }
}
```

### Handle Token Expiration

```cpp
// ✅ CORRECT: Check expiry before operations
bool isTokenExpired() {
    long expiryTime = preferences.getLong("token_expiry", 0);
    long currentTime = time(nullptr);
    
    // Refresh if within 5 minutes of expiry
    return (expiryTime - currentTime) < 300;
}

void ensureValidToken() {
    if (isTokenExpired()) {
        if (!refreshToken()) {
            // Refresh failed - need to reactivate
            activateDevice();
        }
    }
}

bool refreshToken() {
    String deviceId = preferences.getString("device_id");
    String currentToken = preferences.getString("device_token");
    
    // POST to /devices/refresh-token
    https.begin(client, "https://api.biosense.com/devices/refresh-token");
    https.addHeader("Authorization", "Bearer " + currentToken);
    
    int response = https.POST("");
    
    if (response == 200) {
        String newToken = extractToken(https.getString());
        preferences.putString("device_token", newToken);
        preferences.putLong("token_expiry", time(nullptr) + 3600);
        https.end();
        return true;
    } else if (response == 401) {
        // Token invalid - need full reactivation
        https.end();
        return false;
    } else {
        // Network error - retry later
        https.end();
        return false;
    }
}
```

---

## 📝 Output Requirements

### Efficient Firmware

**Size Optimization**:
- Remove unnecessary libraries
- Use string concatenation instead of ArduinoJson (if needed)
- Optimize memory usage
- Partition scheme: Huge APP (3MB No OTA)

**Performance**:
- Non-blocking operations (no long delays)
- Efficient WiFi reconnection
- Minimal power consumption
- Fast startup time

### Secure Firmware

**Credential Storage**:
```cpp
// ✅ CORRECT: Store in NVS (non-volatile storage)
preferences.begin("biosense", false);
preferences.putString("device_id", deviceId);
preferences.putString("device_secret", deviceSecret);
preferences.putString("device_token", token);
preferences.end();
```

**No Hardcoded Secrets**:
```cpp
// ❌ WRONG: Hardcoded secrets
const char* DEVICE_SECRET = "super-secret-key";

// ✅ CORRECT: From NVS or provisioning
String secret = preferences.getString("device_secret");
```

**Error Handling**:
```cpp
// ✅ CORRECT: Catch specific errors
if (response == 401) {
    Serial.println("❌ Unauthorized - token expired");
    refreshToken();
} else if (response == 409) {
    Serial.println("⚠️  Duplicate reading - deduplication detected");
} else if (response == 429) {
    Serial.println("⚠️  Rate limited - waiting");
    delay(5000);
} else if (response == 200) {
    Serial.println("✅ Data sent successfully");
}
```

---

## 🏗️ Device Architecture

### Firmware Structure

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <time.h>

Preferences preferences;

// Configuration
const char* SSID = "your-wifi";
const char* PASSWORD = "your-password";
const char* BACKEND_URL = "https://api.biosense.com";
const char* ROOT_CA = "-----BEGIN CERTIFICATE-----\n...";

// Sensor pins
#define MQ4_PIN A0
#define MQ7_PIN A1
#define MQ135_PIN A2

void setup() {
    Serial.begin(115200);
    preferences.begin("biosense", false);
    
    setupWiFi();
    setupTime();
    setupSensors();
    
    // Check if device needs activation
    if (!isActivated()) {
        waitForBLEProvisioning();
        activateDevice();
    }
}

void loop() {
    ensureConnected();
    ensureValidToken();
    
    float mq4 = readMQ4Sensor();
    float mq7 = readMQ7Sensor();
    float mq135 = readMQ135Sensor();
    
    sendSensorData(mq4, mq7, mq135);
    
    delay(60000);  // Send every 60 seconds
}

// === WiFi Management ===
void setupWiFi() {
    WiFi.begin(SSID, PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi connected");
    } else {
        Serial.println("\n❌ WiFi failed");
    }
}

void ensureConnected() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("📡 Reconnecting WiFi...");
        setupWiFi();
    }
}

// === Time Setup (for HTTPS) ===
void setupTime() {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("⏰ Waiting for time...");
    time_t now = time(nullptr);
    while (now < 24 * 3600 * 2) {
        delay(500);
        Serial.print(".");
        now = time(nullptr);
    }
    Serial.println("\n✅ Time synced");
}

// === Device Activation ===
bool isActivated() {
    return preferences.getString("device_id").length() > 0;
}

void activateDevice() {
    String deviceId = preferences.getString("device_id");
    String deviceSecret = preferences.getString("device_secret");
    
    String payload = "{\"deviceId\":\"" + deviceId + 
                    "\",\"deviceSecret\":\"" + deviceSecret + "\"}";
    
    WiFiClientSecure client;
    client.setCACert(ROOT_CA);
    
    HTTPClient https;
    https.begin(client, BACKEND_URL "/devices/activate");
    https.addHeader("Content-Type", "application/json");
    
    int response = https.POST(payload);
    
    if (response == 200) {
        String token = extractToken(https.getString());
        preferences.putString("device_token", token);
        preferences.putLong("token_expiry", time(nullptr) + 3600);
        Serial.println("✅ Device activated");
    } else {
        Serial.println("❌ Activation failed");
    }
    
    https.end();
}

// === Sensor Operations ===
void sendSensorData(float mq4, float mq7, float mq135) {
    ensureValidToken();
    String token = preferences.getString("device_token");
    
    String readingId = generateReadingId();
    String payload = "{\"deviceId\":\"" + preferences.getString("device_id") +
                    "\",\"readingId\":\"" + readingId +
                    "\",\"mq4\":" + String(mq4) +
                    ",\"mq7\":" + String(mq7) +
                    ",\"mq135\":" + String(mq135) + "}";
    
    WiFiClientSecure client;
    client.setCACert(ROOT_CA);
    
    HTTPClient https;
    https.begin(client, BACKEND_URL "/api/v2/sensors/reading");
    https.addHeader("Authorization", "Bearer " + token);
    https.addHeader("Content-Type", "application/json");
    
    int response = https.POST(payload);
    
    if (response == 200) {
        Serial.println("✅ Data sent");
    } else if (response == 401) {
        Serial.println("🔄 Token expired, refreshing...");
        refreshToken();
    } else if (response == 409) {
        Serial.println("⚠️  Duplicate reading");
    } else if (response == 429) {
        Serial.println("⚠️  Rate limited");
        delay(5000);
    }
    
    https.end();
}

// === Token Management ===
bool isTokenExpired() {
    long expiryTime = preferences.getLong("token_expiry", 0);
    long currentTime = time(nullptr);
    return (expiryTime - currentTime) < 300;
}

bool refreshToken() {
    String token = preferences.getString("device_token");
    
    WiFiClientSecure client;
    client.setCACert(ROOT_CA);
    
    HTTPClient https;
    https.begin(client, BACKEND_URL "/devices/refresh-token");
    https.addHeader("Authorization", "Bearer " + token);
    
    int response = https.POST("");
    
    if (response == 200) {
        String newToken = extractToken(https.getString());
        preferences.putString("device_token", newToken);
        preferences.putLong("token_expiry", time(nullptr) + 3600);
        Serial.println("✅ Token refreshed");
        https.end();
        return true;
    }
    
    https.end();
    return false;
}

// === Utilities ===
String generateReadingId() {
    // Generate UUID-like string
    // In production, use crypto library for true UUID
    return "reading_" + String(millis());
}

String extractToken(String response) {
    // Parse JSON response for token
    // Use minimal JSON parsing to save space
    int startIdx = response.indexOf("\"token\":\"") + 9;
    int endIdx = response.indexOf("\"", startIdx);
    return response.substring(startIdx, endIdx);
}
```

---

## ✅ Code Review Checklist

Before approving any firmware code:

- [ ] Uses HTTPS only (WiFiClientSecure)
- [ ] Bearer token used (not API keys)
- [ ] Device JWT implemented correctly
- [ ] Activation flow complete
- [ ] Token refresh logic present
- [ ] Retry logic with backoff
- [ ] readingId generated for each reading
- [ ] Error handling for 401/409/429
- [ ] No hardcoded secrets
- [ ] Credentials stored in NVS
- [ ] WiFi reconnection logic
- [ ] Time sync before HTTPS
- [ ] Non-blocking operations
- [ ] Efficient code (no unnecessary libraries)
- [ ] Guardian rules followed


## 🚀 When to Use This Skill

Use this skill when:
- Building new ESP32 firmware
- Implementing device authentication
- Adding sensor communication
- Refactoring existing firmware
- Improving security
- Optimizing for size/performance

---

## 📚 Reference Materials

Guardian System:
- `.instructions.md` → Core architecture rules
- `ARCHITECTURE-GUARDIAN-GUIDE.md` → Patterns and workflows

ESP32 Docs:
- Espressif ESP32 datasheet
- Arduino IDE for ESP32
- WiFiClientSecure documentation
- Preferences (NVS) API

Security:
- TLS/SSL for embedded systems
- JWT token management
- Device authentication patterns

---

**Skill Status**: ✅ Active and Ready  
**Version**: 1.0  
**Created**: 2024-04-20  

Use alongside System Architecture Guardian for maximum compliance!
