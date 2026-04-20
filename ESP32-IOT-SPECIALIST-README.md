╔═══════════════════════════════════════════════════════════════════════════════╗
║            ✅ ESP32 IOT SPECIALIST SKILL - CREATED                           ║
║                                                                               ║
║         Secure firmware expert for ESP32 device communication                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🎯 SKILL DEFINITION
═══════════════════════════════════════════════════════════════════════════════

Name: ESP32 IoT Specialist
Role: ESP32 Firmware Expert
Focus: Secure, efficient, resilient device communication
Technology: ESP32-32D N4 + WiFi + TLS/HTTPS + JWT + BLE


═══════════════════════════════════════════════════════════════════════════════
📋 MUST FOLLOW (Non-Negotiable Rules)
═══════════════════════════════════════════════════════════════════════════════

1️⃣  OBEY SYSTEM ARCHITECTURE GUARDIAN
    ├─ Three Sacred Rules from .instructions.md
    ├─ Device flow (5-step process)
    ├─ Security best practices
    ├─ Data integrity (readingId deduplication)
    └─ See: .instructions.md + ARCHITECTURE-GUARDIAN-GUIDE.md

2️⃣  DEVICE RULES

    A) Authenticate Using Device JWT
       ├─ Step 1: User registers device in app
       ├─ Step 2: Get deviceId + deviceSecret via BLE
       ├─ Step 3: Call /devices/activate with credentials
       ├─ Step 4: Backend returns deviceToken (JWT)
       ├─ Step 5: Use token for all sensor operations
       └─ NEVER: API keys

    B) Must NOT Use API Keys
       ├─ Never: X-BioSense-Key header
       ├─ Always: Authorization: Bearer <jwt>
       └─ Why: API keys have no signature/expiration

    C) Must Implement Activation Flow
       ├─ Device provisioning (BLE)
       ├─ Credential storage (NVS)
       ├─ Activation call (/devices/activate)
       ├─ Token storage
       ├─ Sensor operations
       └─ Token refresh


3️⃣  NETWORK RULES

    A) HTTPS Only
       ├─ Always: WiFiClientSecure
       ├─ Always: Certificate validation
       ├─ Never: HTTP (unencrypted)
       └─ Why: Prevent man-in-the-middle attacks

    B) Retry Logic
       ├─ Exponential backoff (1s → 60s)
       ├─ Max retries: 5
       ├─ Retry on 429 (rate limit)
       ├─ Retry on 503 (unavailable)
       └─ Don't retry on 400, 401, 409

    C) Handle Token Expiration
       ├─ Check before sending data
       ├─ Refresh 5 minutes before expiry
       ├─ Retry on 401 with new token
       └─ Reactivate if refresh fails


═══════════════════════════════════════════════════════════════════════════════
✅ DEVICE FLOW (5 Steps)
═══════════════════════════════════════════════════════════════════════════════

Step 1: DEVICE PROVISIONING
  User creates device in mobile app
  ├─ User UUID → Backend
  ├─ Backend generates deviceId + deviceSecret
  ├─ Sends via BLE to ESP32
  └─ ESP32 stores in NVS

Step 2: DEVICE ACTIVATION
  ESP32 calls POST /devices/activate
  ├─ Payload: {deviceId, deviceSecret}
  ├─ Backend verifies credentials
  ├─ Backend generates deviceToken (JWT)
  └─ Returns: {token, expiryTime}

Step 3: TOKEN STORAGE
  ESP32 stores token in NVS
  ├─ Stores deviceToken
  ├─ Stores expiryTime
  └─ Ready for operations

Step 4: SENSOR OPERATIONS
  ESP32 sends sensor readings
  ├─ Generate unique readingId (UUID)
  ├─ Build JSON payload
  ├─ Use Bearer token in header
  ├─ POST to /api/v2/sensors/reading
  └─ Backend deduplicates by readingId

Step 5: TOKEN REFRESH
  Before token expires
  ├─ Check if token expires in < 5 minutes
  ├─ If yes: Call /devices/refresh-token
  ├─ Get new token
  ├─ Store in NVS
  └─ Continue operations


═══════════════════════════════════════════════════════════════════════════════
🚫 FORBIDDEN (Will Be Rejected)
═══════════════════════════════════════════════════════════════════════════════

❌ API KEYS
   Never: http.addHeader("X-BioSense-Key", secretKey)
   Always: http.addHeader("Authorization", "Bearer " + token)

❌ HTTP (Unencrypted)
   Never: http.begin("http://api.biosense.com/...")
   Always: https.begin(client, "https://api.biosense.com/...")

❌ NO RETRY LOGIC
   Never: Send once and give up
   Always: Exponential backoff with max 5 retries

❌ HARDCODED SECRETS
   Never: const char* SECRET = "super-secret";
   Always: String secret = preferences.getString("device_secret");

❌ TOKEN NEVER CHECKED
   Never: Use expired token
   Always: Check expiry, refresh before sending


═══════════════════════════════════════════════════════════════════════════════
✅ CORRECT PATTERNS (Copy These)
═══════════════════════════════════════════════════════════════════════════════

PATTERN 1: Store Credentials in NVS

preferences.begin("biosense", false);
preferences.putString("device_id", deviceId);
preferences.putString("device_secret", deviceSecret);
preferences.putString("device_token", token);
preferences.putLong("token_expiry", now() + 3600);
preferences.end();


PATTERN 2: Device Activation

void activateDevice() {
    String deviceId = preferences.getString("device_id");
    String deviceSecret = preferences.getString("device_secret");
    
    String payload = "{\"deviceId\":\"" + deviceId + 
                    "\",\"deviceSecret\":\"" + deviceSecret + "\"}";
    
    WiFiClientSecure client;
    client.setCACert(ROOT_CA);
    
    HTTPClient https;
    https.begin(client, "https://api.biosense.com/devices/activate");
    https.addHeader("Content-Type", "application/json");
    
    int response = https.POST(payload);
    
    if (response == 200) {
        String token = extractToken(https.getString());
        preferences.putString("device_token", token);
        preferences.putLong("token_expiry", time(nullptr) + 3600);
        Serial.println("✅ Activated");
    }
    
    https.end();
}


PATTERN 3: Send with Bearer Token

void sendSensorData(float mq4, float mq7, float mq135) {
    ensureValidToken();  // Check expiry first
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
    https.begin(client, "https://api.biosense.com/api/v2/sensors/reading");
    https.addHeader("Authorization", "Bearer " + token);  // ← Bearer token!
    https.addHeader("Content-Type", "application/json");
    
    int response = https.POST(payload);
    
    if (response == 200) {
        Serial.println("✅ Sent");
    } else if (response == 401) {
        refreshToken();  // Refresh and retry
    } else if (response == 409) {
        Serial.println("⚠️  Duplicate");
    } else if (response == 429) {
        delay(5000);  // Wait before retry
    }
    
    https.end();
}


PATTERN 4: Retry with Exponential Backoff

int retryCount = 0;
unsigned long backoffTime = 1000;  // Start at 1 second

while (retryCount < 5) {
    int response = https.POST(payload);
    
    if (response == 200) {
        return true;  // Success!
    } else if (response == 429 || response == 503) {
        retryCount++;
        delay(backoffTime);
        backoffTime = min(backoffTime * 2, 60000);  // Max 60 seconds
    } else if (response == 401) {
        // Token expired - refresh and retry
        if (refreshToken()) {
            token = preferences.getString("device_token");
            https.addHeader("Authorization", "Bearer " + token);
            continue;
        } else {
            return false;
        }
    } else {
        return false;  // Don't retry
    }
}


PATTERN 5: Token Expiry Handling

bool isTokenExpired() {
    long expiryTime = preferences.getLong("token_expiry", 0);
    long currentTime = time(nullptr);
    
    // Refresh if within 5 minutes of expiry
    return (expiryTime - currentTime) < 300;
}

void ensureValidToken() {
    if (isTokenExpired()) {
        if (!refreshToken()) {
            activateDevice();  // Full reactivation if refresh fails
        }
    }
}


═══════════════════════════════════════════════════════════════════════════════
❌ WRONG PATTERNS (Never Do This)
═══════════════════════════════════════════════════════════════════════════════

WRONG 1: Using API Keys

https.addHeader("X-BioSense-Key", "my-secret-key");
// ❌ FORBIDDEN


WRONG 2: Using HTTP (unencrypted)

http.begin("http://api.biosense.com/api/v2/sensors/reading");
// ❌ FORBIDDEN


WRONG 3: No Retry Logic

int response = https.POST(payload);
if (response != 200) {
    Serial.println("Failed");
    // ❌ No retry logic!
}


WRONG 4: Never Checking Token Expiry

void sendData() {
    String token = preferences.getString("device_token");
    // ❌ What if token expired 2 hours ago?
    https.addHeader("Authorization", "Bearer " + token);
    https.POST(payload);
}


WRONG 5: Hardcoded Credentials

const char* DEVICE_SECRET = "super-secret-123";
// ❌ Secret exposed in code!


═══════════════════════════════════════════════════════════════════════════════
📊 ERROR CODE HANDLING
═══════════════════════════════════════════════════════════════════════════════

200 OK
  ✅ Data sent successfully
  └─ Action: Continue

400 Bad Request
  ❌ Invalid payload
  └─ Action: Fix payload, don't retry

401 Unauthorized
  🔄 Token invalid/expired
  └─ Action: Refresh token or reactivate

403 Forbidden
  ❌ Not authorized for this resource
  └─ Action: Check device permissions

409 Conflict
  ⚠️  Duplicate reading_id
  └─ Action: Log (deduplication working)

429 Too Many Requests
  ⏱️  Rate limited
  └─ Action: Wait 5-60 seconds, retry

503 Service Unavailable
  🔄 Backend down
  └─ Action: Retry with backoff

5xx Server Error
  ⚠️  Backend error
  └─ Action: Log, retry with backoff


═══════════════════════════════════════════════════════════════════════════════
🏗️ FIRMWARE ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────┐
│ Setup Phase                         │
├─────────────────────────────────────┤
│ • Initialize serial                 │
│ • Initialize NVS storage            │
│ • Setup WiFi                        │
│ • Sync time (NTP)                   │
│ • Setup sensors                     │
│ • Check device activation           │
│ • If not activated: Wait for BLE    │
│ • If activated: Continue            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Main Loop (Every 60 seconds)        │
├─────────────────────────────────────┤
│ • Ensure WiFi connected             │
│ • Ensure token valid                │
│ • Read sensors (MQ4, MQ7, MQ135)   │
│ • Generate unique readingId (UUID)  │
│ • Build JSON payload                │
│ • Use Bearer token in header        │
│ • POST with HTTPS                   │
│ • Handle response (200, 401, 429)   │
│ • Retry if needed (exponential)     │
└─────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════
✅ CODE REVIEW CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Before approving ANY firmware code:

HTTPS & SECURITY:
  [ ] Uses WiFiClientSecure (HTTPS)
  [ ] Never uses HTTP
  [ ] Certificate validation present
  [ ] Bearer token used (not API keys)
  [ ] No hardcoded secrets

DEVICE FLOW:
  [ ] Activation implemented
  [ ] Token storage in NVS
  [ ] Token refresh before expiry
  [ ] Retry on 401 with new token

AUTHENTICATION:
  [ ] Device JWT used correctly
  [ ] JWT verified by backend
  [ ] deviceId from NVS (not hardcoded)
  [ ] deviceSecret never sent after activation

DATA INTEGRITY:
  [ ] readingId generated per reading
  [ ] readingId unique per device
  [ ] Backend deduplicates by readingId
  [ ] No duplicate readings

ERROR HANDLING:
  [ ] 200 OK handled
  [ ] 401 Unauthorized → refresh token
  [ ] 409 Conflict → log (dedup working)
  [ ] 429 Rate limit → wait + retry
  [ ] Network errors → retry with backoff

RESILIENCE:
  [ ] Retry logic present
  [ ] Exponential backoff (1s to 60s)
  [ ] Max 5 retries
  [ ] WiFi reconnection logic
  [ ] Token refresh before expiry

PERFORMANCE:
  [ ] No blocking delays
  [ ] Efficient code (size optimized)
  [ ] Minimal memory usage
  [ ] Fast WiFi reconnection


═══════════════════════════════════════════════════════════════════════════════
🚀 WHEN TO USE THIS SKILL
═══════════════════════════════════════════════════════════════════════════════

Use this skill when:
  ✅ Building new ESP32 firmware
  ✅ Implementing device authentication
  ✅ Adding sensor communication
  ✅ Refactoring existing firmware
  ✅ Improving security
  ✅ Adding WiFi reconnection
  ✅ Implementing token refresh
  ✅ Optimizing for size


═══════════════════════════════════════════════════════════════════════════════
📚 REFERENCE MATERIALS
═══════════════════════════════════════════════════════════════════════════════

Guardian System:
  • .instructions.md → Core rules
  • ARCHITECTURE-GUARDIAN-GUIDE.md → Workflows
  • ESP32-IOT-SPECIALIST-SKILL.md → This skill

ESP32 Resources:
  • Espressif ESP32 datasheet
  • Arduino IDE for ESP32
  • Preferences (NVS) API
  • WiFiClientSecure docs

Security:
  • TLS/SSL for embedded
  • JWT token management
  • Device authentication patterns


═══════════════════════════════════════════════════════════════════════════════
💡 KEY PRINCIPLES
═══════════════════════════════════════════════════════════════════════════════

1. ALWAYS HTTPS
   Never send unencrypted data over WiFi

2. JWT AUTHENTICATION
   Always use device JWT, never API keys

3. ACTIVATION FLOW
   Follow 5-step process consistently

4. RETRY SMART
   Retry with backoff, don't retry forever

5. HANDLE TOKEN EXPIRY
   Check before sending, refresh proactively

6. DEDUPLICATION
   Generate unique readingId per reading

7. ERROR RESILIENCE
   Graceful handling of all error codes

8. EFFICIENT CODE
   Optimize for size and memory


═══════════════════════════════════════════════════════════════════════════════

🎉 ESP32 IOT SPECIALIST SKILL - READY TO USE

Status: ✅ Active
Version: 1.0
Created: 2024-04-20

Use this skill alongside System Architecture Guardian for maximum compliance!
