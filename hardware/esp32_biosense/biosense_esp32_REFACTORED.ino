// ================= BIOSENSE IoT v3 - REFACTORED FIRMWARE =================
// Embedded System Expert Implementation
// - State Machine Architecture
// - Strict WiFi Verification
// - User Binding Flow (BLE → WiFi → API Secret)
// - Radio Coexistence (BLE deinit after binding)
// - Non-blocking Operations
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include <math.h>
#include <time.h>
#include <esp_system.h>

// ================= PIN CONFIGURATION =================
#define MQ4_PIN   35    // GPIO 35 (ADC1_CH7)
#define MQ7_PIN   34    // GPIO 34 (ADC1_CH6)
#define MQ135_PIN 32    // GPIO 32 (ADC1_CH4)

#define LED_GREEN  25   // GPIO 25 - LED Verde (Aire Sano)
#define LED_ORANGE 26   // GPIO 26 - LED Naranja (Moderado/Espera)
#define LED_RED    27   // GPIO 27 - LED Rojo (Peligro)

// ================= BLE CONFIG =================
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ================= BACKEND CONFIG =================
#define BACKEND_HOST "biosenseiot-production-e061.up.railway.app"
#define BACKEND_PORT 443
#define BACKEND_ENDPOINT "/api/v2/sensors/reading"

// ================= BUFFER CONFIG =================
#define BUFFER_DEDUP_SIZE 100

// ================= STATE MACHINE ENUM =================
enum DeviceState {
  STATUS_UNCONFIGURED = 0,   // Waiting for BLE binding (no api_secret)
  STATUS_WARMUP = 1,         // WiFi connected, warming up sensors
  STATUS_OPERATIONAL = 2     // Reading and sending data every 10s
};

// ================= GLOBAL VARIABLES =================
Preferences preferences;
DeviceState currentState = STATUS_UNCONFIGURED;
String macAddress = "";
String configuredSsid = "";
String configuredPassword = "";
String apiSecret = "";

// Non-blocking timers
unsigned long lastReadTime = 0;
unsigned long lastBlinkTime = 0;
unsigned long stateChangeTime = 0;
unsigned long wifiRetryTime = 0;

// State flags
bool bleInitialized = false;
bool wifiConnected = false;
bool ledBlinkState = false;

// Constants
const unsigned long SENSOR_READ_INTERVAL = 10000;      // 10 seconds
const unsigned long STARTUP_WARMUP_TIME = 30000;       // 30 seconds
const unsigned long LED_BLINK_INTERVAL = 500;          // 500ms blink
const unsigned long WIFI_RETRY_INTERVAL = 15000;       // 15 seconds
const unsigned long WIFI_CONNECT_TIMEOUT = 20000;      // 20 seconds
const unsigned long NTP_SYNC_TIMEOUT_MS = 8000;
const unsigned long MIN_VALID_EPOCH = 1700000000UL;

// ================= SENSOR CALIBRATION =================
const float RL_MQ4   = 20.0;
const float R0_MQ4   = 10.0;
const float RL_MQ7   = 10.0;
const float R0_MQ7   = 10.0;
const float RL_MQ135 = 20.0;
const float R0_MQ135 = 10.0;

// ================= SENSOR READINGS BUFFER =================
struct SensorReading {
  String readingId;
  float mq4;
  float mq7;
  float mq135;
  unsigned long timestamp;
};

SensorReading readingBuffer[BUFFER_DEDUP_SIZE];
int bufferIndex = 0;

// ================= RISK LEVELS =================
enum RiskLevel {
  SAFE = 0,
  WARNING = 1,
  DANGER = 2
};

struct SensorSnapshot {
  int rawMq4;
  int rawMq7;
  int rawMq135;
  float ch4;
  float co;
  float airQuality;
  bool valid;
};

// ================= BLE CALLBACKS =================
class BLECallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    uint8_t* data = pCharacteristic->getData();
    size_t len = pCharacteristic->getLength();
    
    if (len == 0 || data == nullptr) {
      Serial.println("❌ BLE: No data received");
      return;
    }
    
    // Convert uint8_t array to String
    String payload = "";
    for (size_t i = 0; i < len; i++) {
      payload += (char)data[i];
    }
    payload.trim();
    
    Serial.println("\n📥 BLE DATA RECEIVED: " + payload);
    
    // Parse: SSID,PASSWORD,API_SECRET
    int firstComma = payload.indexOf(',');
    if (firstComma <= 0) {
      Serial.println("❌ Invalid format. Expected: SSID,PASSWORD,API_SECRET");
      return;
    }
    
    String ssid = payload.substring(0, firstComma);
    String rest = payload.substring(firstComma + 1);
    
    int secondComma = rest.indexOf(',');
    String password = (secondComma > 0) ? rest.substring(0, secondComma) : rest;
    String secret = (secondComma > 0) ? rest.substring(secondComma + 1) : "";
    
    if (secret.length() == 0) {
      Serial.println("❌ API_SECRET is required");
      return;
    }
    
    // Save to NVS
    preferences.begin("biosense", false);
    preferences.putString("ssid", ssid);
    preferences.putString("password", password);
    preferences.putString("api_secret", secret);
    preferences.putString("bound_at", String(millis()));
    preferences.end();
    
    Serial.println("\n✅ CREDENTIALS SAVED TO NVS:");
    Serial.println("   SSID: " + ssid);
    Serial.println("   SECRET: " + secret.substring(0, 8) + "...");
    Serial.println("\n🔄 RESTARTING IN 2 SECONDS...\n");
    
    delay(2000);
    ESP.restart();
  }
};

// ================= HELPER FUNCTIONS =================

/**
 * Genera ID único para cada lectura
 */
String generateReadingId() {
  unsigned long epochTime = time(nullptr);
  if (epochTime < MIN_VALID_EPOCH) {
    epochTime = MIN_VALID_EPOCH + (millis() / 1000UL);
  }
  return macAddress + "-" + String(epochTime) + "-" + String(esp_random(), HEX);
}

/**
 * Verifica si una lectura ya fue enviada
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
 * Agrega lectura al buffer de deduplicación
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
 * Promedio ADC con múltiples muestras
 */
int readAdcAverage(int pin, int samples = 5) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(5);
  }
  return (int)(sum / samples);
}

/**
 * Calcula PPM a partir de valor ADC
 */
float calculatePPM(int adcValue, float RL, float R0, float a, float b) {
  const int ADC_MIN_VALID = 15;
  const int ADC_MAX_VALID = 4080;
  
  if (adcValue < ADC_MIN_VALID || adcValue > ADC_MAX_VALID) {
    return 0.0;
  }
  
  float voltage = (adcValue / 4095.0) * 3.3;
  if (voltage <= 0.05 || voltage >= 3.25) {
    return 0.0;
  }
  
  float Rs = ((3.3 * RL) / voltage) - RL;
  if (Rs <= 0.0) {
    return 0.0;
  }
  
  float ratio = Rs / R0;
  if (ratio < 0.05) ratio = 0.05;
  if (ratio > 20.0) ratio = 20.0;
  
  float ppm = a * pow(ratio, b);
  if (isnan(ppm) || isinf(ppm) || ppm < 0.0) {
    return 0.0;
  }
  
  return ppm;
}

float clampPpm(float ppm, float maxPpm) {
  if (isnan(ppm) || isinf(ppm) || ppm < 0) {
    return 0.0;
  }
  return (ppm > maxPpm) ? maxPpm : ppm;
}

/**
 * Lee todos los sensores
 */
SensorSnapshot readSensors() {
  SensorSnapshot snapshot;
  snapshot.rawMq4 = readAdcAverage(MQ4_PIN);
  snapshot.rawMq7 = readAdcAverage(MQ7_PIN);
  snapshot.rawMq135 = readAdcAverage(MQ135_PIN);
  
  snapshot.ch4 = calculatePPM(snapshot.rawMq4, RL_MQ4, R0_MQ4, 1012.7, -2.78);
  snapshot.co = calculatePPM(snapshot.rawMq7, RL_MQ7, R0_MQ7, 99.0, -1.5);
  snapshot.airQuality = calculatePPM(snapshot.rawMq135, RL_MQ135, R0_MQ135, 110.5, -2.8);
  
  snapshot.ch4 = clampPpm(snapshot.ch4, 10000.0);
  snapshot.co = clampPpm(snapshot.co, 1000.0);
  snapshot.airQuality = clampPpm(snapshot.airQuality, 10000.0);
  
  snapshot.valid = !(snapshot.rawMq4 == 0 && snapshot.rawMq7 == 0 && snapshot.rawMq135 == 0);
  
  return snapshot;
}

/**
 * Evalúa nivel de riesgo
 */
RiskLevel evaluateRiskLevel(float ppmMQ4, float ppmMQ7, float ppmMQ135) {
  if (ppmMQ7 > 30 || ppmMQ4 > 1000 || ppmMQ135 > 2000) {
    return DANGER;
  }
  if (ppmMQ7 > 9 || ppmMQ4 > 500 || ppmMQ135 > 1000) {
    return WARNING;
  }
  return SAFE;
}

/**
 * Actualiza LED de alerta según riesgo
 */
void updateLEDAlert(RiskLevel level) {
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_ORANGE, LOW);
  digitalWrite(LED_RED, LOW);
  
  switch (level) {
    case SAFE:
      digitalWrite(LED_GREEN, HIGH);
      break;
    case WARNING:
      digitalWrite(LED_ORANGE, HIGH);
      break;
    case DANGER:
      digitalWrite(LED_RED, HIGH);
      break;
  }
}

/**
 * Parpadea LED naranja (espera de vinculación)
 */
void blinkLedOrange() {
  if (millis() - lastBlinkTime >= LED_BLINK_INTERVAL) {
    lastBlinkTime = millis();
    ledBlinkState = !ledBlinkState;
    digitalWrite(LED_ORANGE, ledBlinkState ? HIGH : LOW);
  }
}

/**
 * Sincroniza reloj con NTP
 */
void syncClockIfNeeded(bool forceSync = false) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  time_t now = time(nullptr);
  if (now >= (time_t)MIN_VALID_EPOCH && !forceSync) {
    return;
  }
  
  Serial.println("🕒 Syncing clock with NTP...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  now = time(nullptr);
  unsigned long startedAt = millis();
  while (now < (time_t)MIN_VALID_EPOCH && (millis() - startedAt) < NTP_SYNC_TIMEOUT_MS) {
    delay(250);
    now = time(nullptr);
  }
  
  if (now >= (time_t)MIN_VALID_EPOCH) {
    Serial.printf("✅ Clock synced (epoch=%lu)\n", (unsigned long)now);
  } else {
    Serial.println("⚠️ NTP sync timeout");
  }
}

/**
 * Conecta a WiFi (no bloqueante)
 */
bool connectToWifi(const String& ssid, const String& password) {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }
  
  if (wifiConnected && WiFi.status() != WL_CONNECTED) {
    // Reconexión después de desconexión
    if (millis() - wifiRetryTime < WIFI_RETRY_INTERVAL) {
      return false;
    }
    wifiRetryTime = millis();
    Serial.println("🔁 Reconnecting WiFi...");
    WiFi.reconnect();
    return false;
  }
  
  if (!wifiConnected) {
    // Primera conexión
    Serial.println("📶 Connecting to WiFi...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());
    wifiRetryTime = millis();
    return false;
  }
  
  return false;
}

/**
 * Inicializa BLE en modo espera
 */
void initializeBLE() {
  if (bleInitialized) {
    return;
  }
  
  String bleName = "BioSense-" + macAddress.substring(12, 17);
  Serial.println("\n📡 INITIALIZING BLE - WAITING FOR BINDING");
  Serial.println("   Name: " + bleName);
  
  BLEDevice::init(bleName.c_str());
  BLEDevice::setMTU(517);
  
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY |
    BLECharacteristic::PROPERTY_INDICATE
  );
  
  pCharacteristic->setCallbacks(new BLECallbacks());
  pCharacteristic->setValue(macAddress.c_str());
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setAdvertisementType(ADV_TYPE_IND);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  
  BLEDevice::startAdvertising();
  bleInitialized = true;
  
  Serial.println("✅ BLE READY - Waiting for app binding...\n");
}

/**
 * Desinicializa BLE para liberar recursos de radio
 */
void deinitializeBLE() {
  if (!bleInitialized) {
    return;
  }
  
  Serial.println("\n📴 Deinitializing BLE to free radio resources...");
  BLEDevice::deinit(true); // true = full power down
  bleInitialized = false;
  Serial.println("✅ BLE deinitialized\n");
}

/**
 * Envía lectura al backend con reintentos y backoff
 */
bool sendReading(const SensorSnapshot& sensorData) {
  // Verificación estricta de WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected. Skipping send.");
    return false;
  }
  
  if (apiSecret.length() == 0) {
    Serial.println("❌ API Secret not configured. Skipping send.");
    return false;
  }
  
  syncClockIfNeeded();
  
  String readingId = generateReadingId();
  
  if (isDuplicateReading(readingId)) {
    Serial.println("⚠️ Duplicate reading detected. Skipping send.");
    return false;
  }
  
  // Construir JSON payload
  String url = "https://" + String(BACKEND_HOST) + BACKEND_ENDPOINT;
  String authHeader = "Bearer " + apiSecret;
  
  unsigned long epochNow = time(nullptr);
  if (epochNow < MIN_VALID_EPOCH) {
    epochNow = MIN_VALID_EPOCH + (millis() / 1000UL);
  }
  
  String jsonPayload = "{";
  jsonPayload += "\"macAddress\":\"" + macAddress + "\",";
  jsonPayload += "\"readingId\":\"" + readingId + "\",";
  jsonPayload += "\"mq4\":" + String(sensorData.ch4, 2) + ",";
  jsonPayload += "\"mq7\":" + String(sensorData.co, 2) + ",";
  jsonPayload += "\"mq135\":" + String(sensorData.airQuality, 2) + ",";
  jsonPayload += "\"timestamp\":" + String(epochNow);
  jsonPayload += "}";
  
  Serial.println("\n📤 Sending to backend...");
  Serial.println("   URL: " + url);
  Serial.println("   Payload: " + jsonPayload);
  
  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL verification for Railway
  
  HTTPClient http;
  http.setConnectTimeout(6000);
  http.setTimeout(12000);
  
  if (!http.begin(client, url)) {
    Serial.println("❌ Failed to initialize HTTPS");
    return false;
  }
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", authHeader);
  
  int httpCode = http.POST(jsonPayload);
  String response = http.getString();
  
  Serial.printf("   Response: %d\n", httpCode);
  if (response.length() > 0 && response.length() < 200) {
    Serial.println("   Body: " + response);
  }
  
  http.end();
  
  // Handle response codes
  if (httpCode == 200 || httpCode == 201) {
    addToBuffer(readingId, sensorData.ch4, sensorData.co, sensorData.airQuality);
    Serial.println("✅ Reading sent successfully");
    return true;
  } else if (httpCode == 409) {
    addToBuffer(readingId, sensorData.ch4, sensorData.co, sensorData.airQuality);
    Serial.println("✅ Duplicate (409) - Already stored");
    return true;
  } else if (httpCode == 401 || httpCode == 403) {
    Serial.println("❌ Auth failed - Invalid API Secret");
    return false;
  } else {
    Serial.printf("⚠️ HTTP error: %d\n", httpCode);
    return false;
  }
}

/**
 * Máquina de estados: STATUS_UNCONFIGURED
 */
void handleStateUnconfigured() {
  // Initialize BLE if needed
  if (!bleInitialized) {
    initializeBLE();
    stateChangeTime = millis();
    return;
  }
  
  // Blink orange LED to indicate waiting
  blinkLedOrange();
  
  // Check if credentials have been provided (every 5 seconds)
  if (millis() - stateChangeTime >= 5000) {
    stateChangeTime = millis();
    
    preferences.begin("biosense", true);
    String newSecret = preferences.getString("api_secret", "");
    String newSsid = preferences.getString("ssid", "");
    preferences.end();
    
    if (newSecret.length() > 0 && newSsid.length() > 0) {
      Serial.println("\n✅ BINDING DETECTED! Transitioning to WARMUP...");
      apiSecret = newSecret;
      configuredSsid = newSsid;
      configuredPassword = preferences.getString("password", "");
      
      currentState = STATUS_WARMUP;
      stateChangeTime = millis();
      
      // Deinitialize BLE to free radio resources
      deinitializeBLE();
      
      // Turn off LED
      digitalWrite(LED_ORANGE, LOW);
    }
  }
}

/**
 * Máquina de estados: STATUS_WARMUP
 */
void handleStateWarmup() {
  // Attempt WiFi connection
  if (!connectToWifi(configuredSsid, configuredPassword)) {
    // Still trying to connect
    if (millis() - wifiRetryTime > WIFI_CONNECT_TIMEOUT) {
      // Connection timeout - restart
      Serial.println("❌ WiFi connection timeout. Restarting...");
      ESP.restart();
    }
    
    // Blink green LED during warmup
    if ((millis() / 200) % 2 == 0) {
      digitalWrite(LED_GREEN, HIGH);
    } else {
      digitalWrite(LED_GREEN, LOW);
    }
    
    return;
  }
  
  // WiFi connected
  if (!wifiConnected) {
    wifiConnected = true;
    Serial.println("✅ WiFi connected");
    Serial.println("   IP: " + WiFi.localIP().toString());
    syncClockIfNeeded(true);
    stateChangeTime = millis();
    return;
  }
  
  // During warmup period
  if (millis() - stateChangeTime < STARTUP_WARMUP_TIME) {
    unsigned long remaining = (STARTUP_WARMUP_TIME - (millis() - stateChangeTime)) / 1000;
    if (remaining % 5 == 0) {
      Serial.printf("⏳ Warmup: %lus remaining\n", remaining);
    }
    digitalWrite(LED_GREEN, HIGH);
    return;
  }
  
  // Warmup complete - transition to OPERATIONAL
  Serial.println("\n✅ WARMUP COMPLETE - ENTERING OPERATIONAL MODE\n");
  currentState = STATUS_OPERATIONAL;
  lastReadTime = millis();
  digitalWrite(LED_GREEN, LOW);
}

/**
 * Máquina de estados: STATUS_OPERATIONAL
 */
void handleStateOperational() {
  // Check WiFi connection strictly
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi lost. Returning to WARMUP...");
    wifiConnected = false;
    currentState = STATUS_WARMUP;
    wifiRetryTime = millis();
    digitalWrite(LED_RED, LOW);
    return;
  }
  
  // Check sensor read interval
  if (millis() - lastReadTime < SENSOR_READ_INTERVAL) {
    delay(100);
    return;
  }
  
  lastReadTime = millis();
  
  // Read sensors
  SensorSnapshot sensors = readSensors();
  
  if (!sensors.valid) {
    Serial.println("❌ Invalid sensor reading");
    return;
  }
  
  // Evaluate risk and update LED
  RiskLevel riskLevel = evaluateRiskLevel(sensors.ch4, sensors.co, sensors.airQuality);
  updateLEDAlert(riskLevel);
  
  // Log sensor data
  Serial.printf("\n📊 SENSOR DATA: CH4=%.1f | CO=%.1f | Air=%.1f\n", 
                sensors.ch4, sensors.co, sensors.airQuality);
  
  // Send to backend
  sendReading(sensors);
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║  🔥 BIOSENSE IoT v3 - REFACTORED     ║");
  Serial.println("║     State Machine Architecture       ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  // Configure pins
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_ORANGE, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_ORANGE, LOW);
  digitalWrite(LED_RED, LOW);
  
  // Configure ADC
  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);
  
  // Get MAC address
  macAddress = WiFi.macAddress();
  Serial.println("📍 MAC: " + macAddress);
  
  // Load configuration from NVS
  preferences.begin("biosense", true);
  configuredSsid = preferences.getString("ssid", "");
  configuredPassword = preferences.getString("password", "");
  apiSecret = preferences.getString("api_secret", "");
  preferences.end();
  
  // Determine initial state
  if (apiSecret.length() == 0 || configuredSsid.length() == 0) {
    Serial.println("❌ Device not bound. Entering UNCONFIGURED mode.\n");
    currentState = STATUS_UNCONFIGURED;
  } else {
    Serial.println("✅ Device bound. Entering WARMUP mode.\n");
    currentState = STATUS_WARMUP;
  }
  
  stateChangeTime = millis();
  wifiRetryTime = millis();
  lastBlinkTime = millis();
}

// ================= MAIN LOOP (STATE MACHINE) =================
void loop() {
  switch (currentState) {
    case STATUS_UNCONFIGURED:
      handleStateUnconfigured();
      break;
      
    case STATUS_WARMUP:
      handleStateWarmup();
      break;
      
    case STATUS_OPERATIONAL:
      handleStateOperational();
      break;
      
    default:
      currentState = STATUS_UNCONFIGURED;
      break;
  }
  
  // Small delay to prevent watchdog reset
  delay(50);
}
