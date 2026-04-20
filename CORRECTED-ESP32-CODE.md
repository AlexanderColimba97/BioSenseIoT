// ✅ CORRECTED ESP32 CODE - COMPLETE SENSOR INGESTION FUNCTION
// File: hardware/esp32_biosense/biosense_esp32.ino
// Lines: 432-498

/**
 * ✅ FIXED: This function now sends sensor data with correct Authorization header
 * 
 * Authentication Flow:
 * 1. ESP32 reads API Secret from NVS (received via BLE from mobile app)
 * 2. ESP32 sends POST request with "Authorization: Bearer {apiSecret}" header
 * 3. Backend validates Bearer token in SensorControllerV2
 * 4. Backend verifies device ownership (user_id NOT NULL)
 * 5. Database stores reading with UNIQUE(device_id, reading_id) constraint
 * 6. Backend returns 200 OK with air quality state
 * 7. Mobile app receives latest readings and displays on dashboard
 */

// ================= FUNCIÓN: Enviar Datos al Backend =================
void sendSensorDataToBackend(float ppm_mq4, float ppm_mq7, float ppm_mq135) {
  // Verify WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado. No se puede enviar datos.");
    Serial.println("   Intentando reconectar...");
    return;
  }
  
  // Verify API secret was configured (received via BLE)
  if (apiSecret.length() == 0) {
    Serial.println("⚠️ API Secret no configurado. Saltando envío.");
    Serial.println("   SOLUCIÓN: Sincroniza el dispositivo en la App.");
    return;
  }
  
  Serial.println("\n📤 Enviando datos al backend...");
  
  // Generate unique reading ID for deduplication
  String readingId = generateReadingId();
  
  // Check if this reading is already in buffer (duplicate prevention)
  if (isDuplicateReading(readingId)) {
    Serial.println("⚠️ Lectura duplicada detectada. Saltando envío.");
    return;
  }
  
  // Add reading to deduplication buffer
  addToBuffer(readingId, ppm_mq4, ppm_mq7, ppm_mq135);
  
  // Initialize HTTPS client
  HTTPClient http;
  setupSecureClient(http);

  // Connect to backend API endpoint
  http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
  
  // Add HTTP headers
  http.addHeader("Content-Type", "application/json");
  
  // ✅ CRITICAL FIX: Use standard HTTP Authorization Bearer token
  // BEFORE (BROKEN): http.addHeader("X-BioSense-Key", apiSecret);
  // AFTER (FIXED):
  http.addHeader("Authorization", "Bearer " + apiSecret);
  
  // Create JSON payload with sensor readings
  String jsonPayload = "{";
  jsonPayload += "\"macAddress\":\"" + macAddress + "\",";
  jsonPayload += "\"mq4\":" + String(ppm_mq4, 2) + ",";
  jsonPayload += "\"mq7\":" + String(ppm_mq7, 2) + ",";
  jsonPayload += "\"mq135\":" + String(ppm_mq135, 2) + ",";
  jsonPayload += "\"readingId\":\"" + readingId + "\"";
  jsonPayload += "}";
  
  // Log the payload being sent
  Serial.println("   Payload: " + jsonPayload);
  
  // Send POST request with sensor data
  int httpResponseCode = http.POST(jsonPayload);
  
  // Log response code
  Serial.print("   Respuesta HTTP: ");
  Serial.println(httpResponseCode);
  
  // Handle different response codes
  if (httpResponseCode == 403) {
    // Device not linked or API secret invalid
    Serial.println("🚫 Error 403: Hardware no vinculado o API Secret inválido.");
    Serial.println("   SOLUCIÓN: Sincroniza el dispositivo en la App nuevamente.");
  } else if (httpResponseCode == -1) {
    // Network error - cannot reach server
    Serial.println("❌ Error de conexión: No se puede alcanzar el servidor.");
    Serial.println("   Verifica tu conexión WiFi.");
  } else if (httpResponseCode >= 200 && httpResponseCode < 300) {
    // Success - data stored in database
    Serial.println("✅ Datos guardados en la base de datos!");
  } else {
    // Other error - log response
    Serial.println("⚠️ Error en la respuesta del servidor: " + String(httpResponseCode));
    if (http.getString().length() > 0) {
      Serial.println("   Respuesta: " + http.getString());
    }
  }
  
  // Close HTTP connection
  http.end();
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SUPPORTING FUNCTIONS (Already Implemented)
 */

/**
 * Generate unique reading ID using MAC address + milliseconds
 * Format: "AA:BB:CC:DD:EE:FF-156234"
 * Used for deduplication at database level
 */
String generateReadingId() {
  String id = macAddress + "-" + String(millis());
  return id;
}

/**
 * Check if reading ID already exists in deduplication buffer
 * Prevents duplicate submissions within current session
 */
bool isDuplicateReading(const String& readingId) {
  for (int i = 0; i < bufferIndex && i < BUFFER_DEDUP_SIZE; i++) {
    if (readingBuffer[i].readingId == readingId) {
      return true;
    }
  }
  return false;
}

/**
 * Add reading to deduplication buffer
 * Maintains circular buffer of last 100 readings
 */
void addToBuffer(const String& readingId, float mq4, float mq7, float mq135) {
  if (bufferIndex < BUFFER_DEDUP_SIZE) {
    readingBuffer[bufferIndex].readingId = readingId;
    readingBuffer[bufferIndex].mq4 = mq4;
    readingBuffer[bufferIndex].mq7 = mq7;
    readingBuffer[bufferIndex].mq135 = mq135;
    readingBuffer[bufferIndex].timestamp = millis();
    bufferIndex++;
  } else {
    // Rotate buffer if full
    for (int i = 0; i < BUFFER_DEDUP_SIZE - 1; i++) {
      readingBuffer[i] = readingBuffer[i + 1];
    }
    readingBuffer[BUFFER_DEDUP_SIZE - 1].readingId = readingId;
    readingBuffer[BUFFER_DEDUP_SIZE - 1].mq4 = mq4;
    readingBuffer[BUFFER_DEDUP_SIZE - 1].mq7 = mq7;
    readingBuffer[BUFFER_DEDUP_SIZE - 1].mq135 = mq135;
    readingBuffer[BUFFER_DEDUP_SIZE - 1].timestamp = millis();
  }
}

/**
 * Configure HTTPS client with timeouts and connection reuse
 */
void setupSecureClient(HTTPClient& http) {
  http.setConnectTimeout(5000);    // 5 second connection timeout
  http.setTimeout(10000);           // 10 second request timeout
  http.setReuse(true);              // Reuse connection for efficiency
}

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FLOW SUMMARY:
 * 
 * ┌─ ESP32 Main Loop (every 10 seconds) ─────────────────────────┐
 * │                                                               │
 * │  1. Read ADC from 3 sensors                                   │
 * │     - GPIO 35 (MQ4)   → CH4 (Methane)                         │
 * │     - GPIO 34 (MQ7)   → CO (Carbon Monoxide)                  │
 * │     - GPIO 32 (MQ135) → CO2 (Carbon Dioxide)                  │
 * │                                                               │
 * │  2. Convert ADC values to PPM using calibration formulas      │
 * │     - ppm = a * (Rs/R0)^b                                     │
 * │                                                               │
 * │  3. Evaluate air quality risk level                           │
 * │     - SAFE (Green)      : Normal air quality                  │
 * │     - WARNING (Orange)  : Elevated levels                     │
 * │     - DANGER (Red)      : Critical levels                     │
 * │                                                               │
 * │  4. Update LED indicator to match air quality status          │
 * │     - GPIO 25 (Green)   ← SAFE                                │
 * │     - GPIO 26 (Orange)  ← WARNING                             │
 * │     - GPIO 27 (Red)     ← DANGER                              │
 * │                                                               │
 * │  5. Generate unique reading ID                                │
 * │     - Format: "MAC-Timestamp"                                 │
 * │     - Used for deduplication at database                      │
 * │                                                               │
 * │  6. Create JSON payload                                       │
 * │     {                                                         │
 * │       "macAddress": "AA:BB:CC:DD:EE:FF",                      │
 * │       "mq4": 25.30,                                           │
 * │       "mq7": 8.50,                                            │
 * │       "mq135": 450.00,                                        │
 * │       "readingId": "AA:BB:CC:DD:EE:FF-156234"                │
 * │     }                                                         │
 * │                                                               │
 * │  7. Send HTTPS POST to backend                                │
 * │     URL: https://biosenseiot-production.../api/v2/sensors/reading │
 * │     Header: Authorization: Bearer {apiSecret}  ← FIXED        │
 * │     Header: Content-Type: application/json                    │
 * │     Body: {...JSON payload...}                                │
 * │                                                               │
 * │  8. Backend receives request                                  │
 * │     - SecurityConfig validates authentication ✅              │
 * │     - SensorControllerV2 extracts Bearer token ✅              │
 * │     - IngestSensorReadingUseCaseImpl validates device ✅       │
 * │     - Database enforces constraints ✅                        │
 * │     - Returns 200 OK ✅                                       │
 * │                                                               │
 * │  9. ESP32 logs success                                        │
 * │     "✅ Datos guardados en la base de datos!"                 │
 * │                                                               │
 * │  10. Mobile app dashboard updates                             │
 * │      - Fetches latest readings                                │
 * │      - Displays on screen                                     │
 * │      - Shows same LED status as ESP32                         │
 * │                                                               │
 * └───────────────────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AUTHENTICATION ARCHITECTURE:
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Device Registration (User Authenticates)                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │ Mobile App                                                  │
 * │ ├─ User logs in with credentials                            │
 * │ ├─ Receives USER_JWT (access token)                         │
 * │ │                                                            │
 * │ └─→ POST /api/v2/devices/link                               │
 * │    Header: Authorization: Bearer {USER_JWT}                 │
 * │    Body: { deviceName, linkCode }                           │
 * │                                                             │
 * │    Backend                                                  │
 * │    ├─ Validates USER_JWT                                    │
 * │    ├─ Creates Device row with user_id                       │
 * │    ├─ Generates apiSecret (random 32-char string)           │
 * │    └─→ Response: { deviceId, apiSecret }                    │
 * │                                                             │
 * │ Mobile App                                                  │
 * │ ├─ Receives apiSecret                                       │
 * │ └─→ Sends via BLE to ESP32:                                 │
 * │    "SSID,PASSWORD,API_SECRET"                               │
 * │                                                             │
 * │ ESP32                                                       │
 * │ ├─ Receives via BLE onWrite() callback                      │
 * │ ├─ Stores apiSecret in NVS (encrypted)                      │
 * │ └─ Restarts                                                 │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Sensor Ingestion (Device Authenticates) ← WHAT WE FIXED     │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │ ESP32                                                       │
 * │ ├─ Reads sensors every 10 seconds                           │
 * │ ├─ Converts to PPM                                          │
 * │ └─→ POST /api/v2/sensors/reading                            │
 * │    Header: Authorization: Bearer {API_SECRET}  ← FIXED      │
 * │    Body: { macAddress, mq4, mq7, mq135, readingId }        │
 * │                                                             │
 * │    Backend                                                  │
 * │    ├─ SecurityConfig validates .authenticated()             │
 * │    ├─ SensorControllerV2 extracts Bearer token              │
 * │    ├─ IngestSensorReadingUseCaseImpl validates device        │
 * │    ├─ Database checks UNIQUE(device_id, reading_id)         │
 * │    ├─ Inserts sensor_readings row                           │
 * │    └─→ Response: { status, id, airQualityState }            │
 * │                                                             │
 * │ ESP32                                                       │
 * │ └─ Logs: "✅ Datos guardados en la base de datos!"          │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Key Points:
 * ✅ Two different JWTs for two different purposes
 * ✅ User JWT: For device registration (user owns device)
 * ✅ Device JWT/Bearer: For sensor ingestion (device identifies itself)
 * ✅ API Secret never exposed in code or configuration
 * ✅ Only transferred via secure BLE
 * ✅ Standard HTTP Bearer token format (RFC 7235)
 * ✅ Backend validates both authentication layers
 */
