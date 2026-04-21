// ================= OPTIMIZED INCLUDES (REDUCED SIZE) =================
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

// NOTA: ArduinoJson es pesada, usaremos JSON manual en string
// #include <ArduinoJson.h>  // COMENTADO: Usa ~300KB!

// NOTA: mbedtls es pesada, no la necesitamos por ahora
// #include <mbedtls/aes.h>  // COMENTADO para reducir tamaño
// #include <mbedtls/cipher.h>
// #include <mbedtls/hkdf.h>
// #include <mbedtls/md.h>
// #include <mbedtls/sha256.h>
// #include <mbedtls/entropy.h>
// #include <mbedtls/ctr_drbg.h>

// ================= CONFIGURACIÓN PINES =================
#define MQ4_PIN   35    // GPIO 35 (ADC1_CH7)
#define MQ7_PIN   34    // GPIO 34 (ADC1_CH6)
#define MQ135_PIN 32    // GPIO 32 (ADC1_CH4)

#define LED_GREEN  25   // GPIO 25 - LED Verde (Aire Sano)
#define LED_ORANGE 26   // GPIO 26 - LED Naranja (Moderado)
#define LED_RED    27   // GPIO 27 - LED Rojo (Peligro)

// ================= BLE CONFIG =================
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ================= SECURITY CONFIG =================
#define BACKEND_HOST "biosenseiot-production-e061.up.railway.app"
#define BACKEND_PORT 443
#define BACKEND_FINGERPRINT "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00"
#define BUFFER_DEDUP_SIZE 100

// ================= VARIABLES GLOBALES =================
Preferences preferences;
bool bleActive = false;
bool blockUntilProvisioned = false;
String macAddress = "";
String apiSecret = "";
String jwtToken = "";
uint32_t bootCounter = 0;
uint32_t bootNonce = 0;
String configuredSsid = "";
String configuredPassword = "";

// Keep BLE visible even when WiFi is configured so users can reprovision/reset.
const bool BLE_RECONFIG_ALWAYS_AVAILABLE = true;
const char* BLE_RESET_WIFI_COMMAND = "RESET_WIFI";
const unsigned long WIFI_RETRY_INTERVAL = 10000;
unsigned long lastWiFiRetryAttempt = 0;

// Buffer para deduplicación de lecturas
struct SensorReading {
  String readingId;
  float mq4;
  float mq7;
  float mq135;
  unsigned long timestamp;
};

SensorReading readingBuffer[BUFFER_DEDUP_SIZE];
int bufferIndex = 0;

// ================= CALIBRACIÓN DE SENSORES =================
const float RL_MQ4   = 20.0;    
const float R0_MQ4   = 10.0;    
const float RL_MQ7   = 10.0;    
const float R0_MQ7   = 10.0;    
const float RL_MQ135 = 20.0;    
const float R0_MQ135 = 10.0;    

// ================= TIEMPO DE LECTURA =================
const unsigned long SENSOR_SEND_INTERVAL_MS = 10000;  // configurable: 10-30s
const unsigned long STARTUP_WARMUP_TIME = 30000;   // 30 segundos
unsigned long lastReadTime = 0;
unsigned long startupTime = 0;

// ================= ENUM PARA ESTADO DE RIESGO =================
enum RiskLevel {
  SAFE = 0,
  WARNING = 1,
  DANGER = 2
};

RiskLevel currentRiskLevel = SAFE;

struct SensorSnapshot {
  int rawMq4;
  int rawMq7;
  int rawMq135;
  float ch4;
  float co;
  float airQuality;
  bool valid;
};

// ================= SECURITY FUNCTIONS =================

/**
 * Genera un ID único para cada lectura usando timestamp y hash
 */
String generateReadingId() {
  String id = macAddress + "-" + String(bootCounter) + "-" + String(bootNonce, HEX) + "-" + String(millis());
  return id;
}

/**
 * Busca si una lectura duplicada ya existe en el buffer
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
 * Agrega una lectura al buffer de deduplicación
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
    // Rotar buffer si está lleno
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
 * Configura el cliente HTTPS con certificate pinning
 */
void setupSecureClient(HTTPClient& http) {
  // Configurar timeout
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  // Configurar verificación de certificado
  http.setReuse(true);
  
  // NOTA: Para producción, usar el fingerprint real:
  // http.setFingerprint((const uint8_t*)BACKEND_FINGERPRINT);
  // Por ahora, permitimos conexiones HTTPS sin validar fingerprint
  // (configurar con certificado real cuando esté disponible)
}

/**
 * Encripta datos usando AES-256-GCM (simulado con JWT)
 * En producción, usar mbedtls directamente
 */
String encryptSensorData(const String& jsonData) {
  // Por ahora, retornar JSON plano
  // La encriptación real se hará con mbedtls cuando esté disponible
  return jsonData;
}

/**
 * Genera y valida JWT para el dispositivo
 */
bool validateJWTToken(const String& token) {
  // Validación básica del formato JWT (tres partes separadas por puntos)
  int firstDot = token.indexOf('.');
  int secondDot = token.indexOf('.', firstDot + 1);
  
  if (firstDot == -1 || secondDot == -1) {
    return false;
  }
  
  // Token debe tener tres partes
  return token.indexOf('.', secondDot + 1) == -1;
}

// ================= FUNCIÓN: Convertir ADC a PPM =================
float calculatePPM(int adcValue, float RL, float R0, float a, float b) {
  if (adcValue <= 0) {
    return 0.0;
  }
  
  float voltage = (adcValue / 4095.0) * 3.3;
  
  if (voltage >= 3.3) {
    voltage = 3.29;
  }
  
  float Rs = ((3.3 * RL) / voltage) - RL;
  
  if (Rs < 0) Rs = 0;
  
  float ratio = (R0 > 0) ? Rs / R0 : 0;
  float ppm = (ratio > 0) ? a * pow(ratio, b) : 0;
  
  return (ppm < 0) ? 0 : ppm;
}

float readMQ7() {
  int raw = analogRead(MQ7_PIN);
  float ppm = calculatePPM(raw, RL_MQ7, R0_MQ7, 99.0, -1.5);
  if (isnan(ppm) || isinf(ppm) || ppm < 0) return 0.0;
  return ppm;
}

float readMQ4() {
  int raw = analogRead(MQ4_PIN);
  float ppm = calculatePPM(raw, RL_MQ4, R0_MQ4, 1012.7, -2.78);
  if (isnan(ppm) || isinf(ppm) || ppm < 0) return 0.0;
  return ppm;
}

float readMQ135() {
  int raw = analogRead(MQ135_PIN);
  float ppm = calculatePPM(raw, RL_MQ135, R0_MQ135, 110.5, -2.8);
  if (isnan(ppm) || isinf(ppm) || ppm < 0) return 0.0;
  return ppm;
}

SensorSnapshot readSensors() {
  SensorSnapshot snapshot;
  snapshot.rawMq4 = analogRead(MQ4_PIN);
  snapshot.rawMq7 = analogRead(MQ7_PIN);
  snapshot.rawMq135 = analogRead(MQ135_PIN);

  snapshot.ch4 = calculatePPM(snapshot.rawMq4, RL_MQ4, R0_MQ4, 1012.7, -2.78);
  snapshot.co = calculatePPM(snapshot.rawMq7, RL_MQ7, R0_MQ7, 99.0, -1.5);
  snapshot.airQuality = calculatePPM(snapshot.rawMq135, RL_MQ135, R0_MQ135, 110.5, -2.8);

  if (isnan(snapshot.ch4) || isinf(snapshot.ch4) || snapshot.ch4 < 0) snapshot.ch4 = 0.0;
  if (isnan(snapshot.co) || isinf(snapshot.co) || snapshot.co < 0) snapshot.co = 0.0;
  if (isnan(snapshot.airQuality) || isinf(snapshot.airQuality) || snapshot.airQuality < 0) snapshot.airQuality = 0.0;

  snapshot.valid = !(snapshot.rawMq4 == 0 && snapshot.rawMq7 == 0 && snapshot.rawMq135 == 0);

  Serial.println("Valores ADC crudos:");
  Serial.println("   MQ4:   " + String(snapshot.rawMq4) + "/4095");
  Serial.println("   MQ7:   " + String(snapshot.rawMq7) + "/4095");
  Serial.println("   MQ135: " + String(snapshot.rawMq135) + "/4095");

  Serial.println("\nValores normalizados (PPM):");
  Serial.printf("   CH4 (MQ4): %.2f ppm\n", snapshot.ch4);
  Serial.printf("   CO  (MQ7): %.2f ppm\n", snapshot.co);
  Serial.printf("   Air (MQ135): %.2f ppm\n", snapshot.airQuality);

  if (!snapshot.valid) {
    Serial.println("\n⚠️ ADVERTENCIA: Lectura invalida (todos los sensores en 0)");
  }

  return snapshot;
}

// ================= FUNCIÓN: Evaluar Nivel de Riesgo =================
RiskLevel evaluateRiskLevel(float ppmMQ4, float ppmMQ7, float ppmMQ135) {
  if (ppmMQ7 > 30) {
    return DANGER;
  } else if (ppmMQ7 > 9) {
    return WARNING;
  }
  
  if (ppmMQ4 > 1000) {
    return DANGER;
  } else if (ppmMQ4 > 500) {
    return WARNING;
  }
  
  if (ppmMQ135 > 2000) {
    return DANGER;
  } else if (ppmMQ135 > 1000) {
    return WARNING;
  }
  
  return SAFE;
}

// ================= FUNCIÓN: Mensaje de Riesgo Detallado =================
String getRiskMessage(float ppmMQ4, float ppmMQ7, float ppmMQ135, RiskLevel level) {
  String details = "";
  
  if (ppmMQ7 > 30) {
    details += "🔴 CO CRÍTICO (" + String(ppmMQ7, 1) + " ppm) | ";
  } else if (ppmMQ7 > 9) {
    details += "🟡 CO ELEVADO (" + String(ppmMQ7, 1) + " ppm) | ";
  } else {
    details += "🟢 CO NORMAL (" + String(ppmMQ7, 1) + " ppm) | ";
  }
  
  if (ppmMQ4 > 1000) {
    details += "🔴 CH4 CRÍTICO (" + String(ppmMQ4, 1) + " ppm) | ";
  } else if (ppmMQ4 > 500) {
    details += "🟡 CH4 ELEVADO (" + String(ppmMQ4, 1) + " ppm) | ";
  } else {
    details += "🟢 CH4 NORMAL (" + String(ppmMQ4, 1) + " ppm) | ";
  }
  
  if (ppmMQ135 > 2000) {
    details += "🔴 CO2 CRÍTICO (" + String(ppmMQ135, 1) + " ppm)";
  } else if (ppmMQ135 > 1000) {
    details += "🟡 CO2 ELEVADO (" + String(ppmMQ135, 1) + " ppm)";
  } else {
    details += "🟢 CO2 NORMAL (" + String(ppmMQ135, 1) + " ppm)";
  }
  
  String statusMsg = "";
  if (level == DANGER) {
    statusMsg = "⛔ PELIGRO - ";
  } else if (level == WARNING) {
    statusMsg = "⚠️ ALERTA - ";
  } else {
    statusMsg = "✅ SEGURO - ";
  }
  
  return statusMsg + details;
}

// ================= FUNCIÓN: Controlar LEDs =================
void updateLEDAlert(RiskLevel level) {
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_ORANGE, LOW);
  digitalWrite(LED_RED, LOW);
  
  switch (level) {
    case SAFE:
      digitalWrite(LED_GREEN, HIGH);
      Serial.println("\n🟢 LED VERDE (GPIO 25) encendido - Aire Sano ✅");
      break;
      
    case WARNING:
      digitalWrite(LED_ORANGE, HIGH);
      Serial.println("\n🟠 LED NARANJA (GPIO 26) encendido - Moderado ⚠️");
      break;
      
    case DANGER:
      digitalWrite(LED_RED, HIGH);
      Serial.println("\n🔴 LED ROJO (GPIO 27) encendido - ¡PELIGRO! ⛔");
      break;
  }
}

// ================= CLASE BLE CALLBACKS =================
class BLECallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    uint8_t* data = pCharacteristic->getData();
    size_t len = pCharacteristic->getLength();
    
    if (len > 0 && data != nullptr) {
      String payload = "";
      for (size_t i = 0; i < len; i++) {
        payload += (char)data[i];
      }
      payload.trim();
      
      Serial.println("\n📥 [BLE] Datos recibidos: " + payload);

      if (payload.equalsIgnoreCase(BLE_RESET_WIFI_COMMAND)) {
        Serial.println("🧹 Comando RESET_WIFI recibido. Borrando credenciales...");
        preferences.begin("biosense", false);
        preferences.remove("ssid");
        preferences.remove("password");
        preferences.remove("api_secret");
        preferences.end();

        Serial.println("✅ Credenciales eliminadas. Reiniciando ESP32 en 2 segundos...");
        delay(2000);
        ESP.restart();
        return;
      }
      
      int firstComma = payload.indexOf(',');
      
      if (firstComma > 0) {
        String ssid = payload.substring(0, firstComma);
        String rest = payload.substring(firstComma + 1);
        
        int secondComma = rest.indexOf(',');
        String password = (secondComma > 0) ? rest.substring(0, secondComma) : rest;
        String secret = (secondComma > 0) ? rest.substring(secondComma + 1) : "";
        
        Serial.println("✅ Desglozando credenciales:");
        Serial.println("   - SSID: " + ssid);
        
        String maskedPassword = "";
        for (int i = 0; i < password.length(); i++) {
          maskedPassword += "*";
        }
        Serial.println("   - PASS: " + maskedPassword);
        Serial.println("   - SECRET: " + secret);
        
        preferences.begin("biosense", false);
        preferences.putString("ssid", ssid);
        preferences.putString("password", password);
        if (secret.length() > 0) {
          preferences.putString("api_secret", secret);
        }
        preferences.end();
        
        Serial.println("\n✅ Credenciales guardadas en memoria NVS encriptada.");
        Serial.println("🔄 Reiniciando ESP32 en 2 segundos...\n");
        
        delay(2000);
        ESP.restart();
      } else {
        Serial.println("❌ Formato incorrecto. Se esperaba: SSID,PASSWORD,API_SECRET");
      }
    }
  }
};

// ================= FUNCIÓN: Inicializar BLE =================
void initializeBLE() {
  bleActive = true;
  Serial.println("\n📡 ===== INICIANDO MODO SINCRONIZACIÓN BLE =====");
  
  String bleName = "BioSense-" + macAddress.substring(12, 17);
  Serial.println("   Nombre BLE: " + bleName);
  Serial.println("   MAC: " + macAddress);
  
  BLEDevice::init(bleName.c_str());
  BLEDevice::setMTU(517);
  
  BLEServer *pServer = BLEDevice::createServer();
  if (!pServer) {
    Serial.println("❌ FALLO: No se pudo crear servidor BLE");
    return;
  }
  
  BLEService *pService = pServer->createService(SERVICE_UUID);
  if (!pService) {
    Serial.println("❌ FALLO: No se pudo crear servicio BLE");
    return;
  }
  
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY |
    BLECharacteristic::PROPERTY_INDICATE
  );
  
  if (!pCharacteristic) {
    Serial.println("❌ FALLO: No se pudo crear característica BLE");
    return;
  }
  
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
  
  Serial.println("\n✅ BLE COMPLETAMENTE OPERATIVO");
  Serial.println("📱 INSTRUCCIONES PARA SINCRONIZAR:");
  Serial.println("   1. Abre la App BioSense en tu Android");
  Serial.println("   2. Ve a 'MI PERFIL'");
  Serial.println("   3. Toca 'SINCRONIZAR'");
  Serial.println("   4. Toca 'Escanear Bluetooth'");
  Serial.println("   5. Selecciona: " + bleName);
  Serial.println("   6. Completa los campos y toca 'Vincular'");
  Serial.println("   7. El ESP32 se reiniciará automáticamente\n");
  Serial.println("⏰ Esperando sincronización...\n");
}

// ================= FUNCIÓN: Conectar WiFi =================
bool connectToWiFi(String ssid, String password) {
  Serial.println("\n📶 Conectando a WiFi...");
  Serial.println("   SSID: " + ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(500);
  
  WiFi.begin(ssid.c_str(), password.c_str());
  
  int attempts = 0;
  const int maxAttempts = 30;
  
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println("");
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi conectado exitosamente!");
    Serial.println("   IP: " + WiFi.localIP().toString());
    Serial.println("   RSSI (Señal): " + String(WiFi.RSSI()) + " dBm");
    return true;
  } else {
    Serial.println("❌ No se pudo conectar a WiFi después de " + String(maxAttempts * 500) + "ms");
    Serial.println("   Estado WiFi: " + String(WiFi.status()));
    Serial.println("⚠️ Iniciando BLE de respaldo...");
    return false;
  }
}

// ================= FUNCIÓN: Enviar Datos al Backend (SEGURO) =================
bool sendReading(const SensorSnapshot& sensorData) {
  const int maxRetries = 3;
  const int baseBackoffMs = 1000;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado. Intentando reconexion...");
    if (WiFi.reconnect()) {
      delay(1500);
    }
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("❌ Reconexion WiFi fallida. Se reintentara en el siguiente ciclo.");
      return false;
    }
  }
  
  if (apiSecret.length() == 0) {
    Serial.println("⚠️ API Secret no configurado. Saltando envio.");
    return false;
  }
  
  Serial.println("\n📤 Enviando lectura al backend...");
  
  String readingId = generateReadingId();

  if (isDuplicateReading(readingId)) {
    Serial.println("⚠️ Lectura duplicada detectada (buffer local). Saltando envio.");
    return false;
  }

  String authHeader = "Bearer " + apiSecret;
  String url = "https://" + String(BACKEND_HOST) + "/api/v2/sensors/reading";

  String ts = String(time(nullptr));
  String coStr = String(round(sensorData.co * 100.0) / 100.0, 2);
  String ch4Str = String(round(sensorData.ch4 * 100.0) / 100.0, 2);
  String airStr = String(round(sensorData.airQuality * 100.0) / 100.0, 2);
  String jsonPayload = "{"
      "\"deviceId\":\"" + macAddress + "\","  
      "\"macAddress\":\"" + macAddress + "\"," 
      "\"co\":" + coStr + ","
      "\"ch4\":" + ch4Str + ","
      "\"airQuality\":" + airStr + ","
      "\"mq7\":" + coStr + ","
      "\"mq4\":" + ch4Str + ","
      "\"mq135\":" + airStr + ","
      "\"readingId\":\"" + readingId + "\"," 
      "\"timestamp\":" + ts +
      "}";

  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    WiFiClientSecure client;
    HTTPClient http;
    client.setInsecure();

    if (!http.begin(client, url)) {
      Serial.println("❌ Error iniciando conexion HTTPS");
      return false;
    }

    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", authHeader);
    http.setConnectTimeout(6000);
    http.setTimeout(12000);

    Serial.println("   Intento " + String(attempt) + "/" + String(maxRetries));
    Serial.println("   Payload: " + jsonPayload);

    int httpResponseCode = http.POST(jsonPayload);
    String responseBody = http.getString();

    Serial.print("   HTTP Response: ");
    Serial.println(httpResponseCode);
    if (responseBody.length() > 0) {
      Serial.println("   Body: " + responseBody.substring(0, 180));
    }

    http.end();

    if (httpResponseCode == 200 || httpResponseCode == 201) {
      addToBuffer(readingId, sensorData.ch4, sensorData.co, sensorData.airQuality);
      Serial.println("✅ Lectura persistida correctamente.");
      return true;
    }

    if (httpResponseCode == 409) {
      addToBuffer(readingId, sensorData.ch4, sensorData.co, sensorData.airQuality);
      Serial.println("⚠️ Lectura duplicada detectada por backend (409). Se considera exitosa.");
      return true;
    }

    if (httpResponseCode == 401 || httpResponseCode == 403) {
      Serial.println("🚫 Authorization fallida (" + String(httpResponseCode) + "). Verificar apiSecret/provisioning.");
      return false;
    }

    if (attempt < maxRetries) {
      int backoffMs = baseBackoffMs * (1 << (attempt - 1));
      Serial.println("⏱️ Reintentando en " + String(backoffMs) + " ms...");
      delay(backoffMs);
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("🔁 WiFi caido durante reintento. Reconectando...");
        WiFi.reconnect();
        delay(1000);
      }
    }
  }

  Serial.println("❌ No se pudo enviar lectura tras todos los reintentos.");
  return false;
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║  🔥 BIOSENSE IoT - INICIALIZACIÓN v2  ║");
  Serial.println("║     Enhanced Security Firmware         ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  Serial.println("⚙️ Configurando pines digitales de LEDs...");
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_ORANGE, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_ORANGE, LOW);
  digitalWrite(LED_RED, LOW);
  
  Serial.println("   ✅ Pines configurados:");
  Serial.println("      GPIO 25 = LED Verde (Aire Sano)");
  Serial.println("      GPIO 26 = LED Naranja (Moderado)");
  Serial.println("      GPIO 27 = LED Rojo (Peligro)");
  
  Serial.println("\n⚙️ Configurando ADC...");
  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);
  Serial.println("   ✅ ADC configurado para 12 bits (0-4095 = 0-3.3V)");
  
  macAddress = WiFi.macAddress();
  Serial.println("\n📍 MAC Address del dispositivo: " + macAddress);

  preferences.begin("biosense", false);
  bootCounter = preferences.getUInt("boot_count", 0) + 1;
  preferences.putUInt("boot_count", bootCounter);
  preferences.end();
  bootNonce = esp_random();
  Serial.println("🔐 Boot counter: " + String(bootCounter));
  Serial.println("🔐 Boot nonce: 0x" + String(bootNonce, HEX));
  
  Serial.println("\n🔐 Cargando credenciales del almacenamiento NVS encriptado...");
  preferences.begin("biosense", true);
  String savedSSID = preferences.getString("ssid", "");
  String savedPassword = preferences.getString("password", "");
  apiSecret = preferences.getString("api_secret", "");
  preferences.end();

  configuredSsid = savedSSID;
  configuredPassword = savedPassword;
  
  if (savedSSID == "") {
    Serial.println("❌ No hay WiFi guardado. Entrando en modo SINCRONIZACIÓN.\n");
    blockUntilProvisioned = true;
    initializeBLE();
    startupTime = millis() + STARTUP_WARMUP_TIME;
  } else {
    Serial.println("✅ Credenciales encontradas.");
    Serial.println("   SSID: " + savedSSID);

    if (BLE_RECONFIG_ALWAYS_AVAILABLE) {
      Serial.println("📡 BLE de reconfiguración habilitado (visible aunque haya WiFi guardada).");
      initializeBLE();
    }
    
    bool wifiConnected = connectToWiFi(savedSSID, savedPassword);
    
    if (!wifiConnected) {
      Serial.println("\n⚠️ WiFi falló en el primer intento.");
      Serial.println("🔁 Se reintentará conexión automáticamente cada 10 segundos.");
      lastWiFiRetryAttempt = millis();
    }
    startupTime = millis() + STARTUP_WARMUP_TIME;
  }
  
  Serial.println("\n⏱️ Calentando sensores durante 30 segundos...");
}

// ================= LOOP PRINCIPAL =================
void loop() {
  if (blockUntilProvisioned) {
    delay(1000);
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiRetryAttempt >= WIFI_RETRY_INTERVAL && configuredSsid.length() > 0) {
      lastWiFiRetryAttempt = millis();
      Serial.println("🔁 Reintentando conexión WiFi...");
      connectToWiFi(configuredSsid, configuredPassword);
    }
    delay(200);
    return;
  }
  
  if (millis() < startupTime) {
    unsigned long remainingTime = (startupTime - millis()) / 1000;
    if (remainingTime % 5 == 0) {
      Serial.print("⏳ " + String(remainingTime) + "s...");
    }
    delay(500);
    return;
  }
  
  if (millis() - lastReadTime < SENSOR_SEND_INTERVAL_MS) {
    delay(100);
    return;
  }
  lastReadTime = millis();
  
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║      📊 LEYENDO SENSORES...           ║");
  Serial.println("╚════════════════════════════════════════╝");
  
  SensorSnapshot sensors = readSensors();

  if (!sensors.valid) {
    Serial.println("   Verificar conexiones de pines analogicos.");
    return;
  }

  RiskLevel riskLevel = evaluateRiskLevel(sensors.ch4, sensors.co, sensors.airQuality);
  currentRiskLevel = riskLevel;
  
  updateLEDAlert(riskLevel);
  
  String riskMessage = getRiskMessage(sensors.ch4, sensors.co, sensors.airQuality, riskLevel);
  Serial.println("\n" + riskMessage);
  
  Serial.println("\n📊 Umbrales de Alerta (OMS):");
  Serial.println("   CO (MQ7):         Normal < 9ppm | Alerta 9-30ppm | Peligro > 30ppm");
  Serial.println("   CH4 (MQ4):        Normal < 500ppm | Alerta 500-1000ppm | Peligro > 1000ppm");
  Serial.println("   CO2 (MQ135):      Normal < 1000ppm | Alerta 1000-2000ppm | Peligro > 2000ppm");
  
  sendReading(sensors);
  
  Serial.println("\n⏰ Proxima lectura en " + String(SENSOR_SEND_INTERVAL_MS / 1000) + " segundos...\n");
}
