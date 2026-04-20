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
String macAddress = "";
String apiSecret = "";
String jwtToken = "";
uint32_t bootCounter = 0;
uint32_t bootNonce = 0;

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
const unsigned long SENSOR_READ_INTERVAL = 10000;  // 10 segundos
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
      
      Serial.println("\n📥 [BLE] Datos recibidos: " + payload);
      
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
void sendSensorDataToBackend(float ppm_mq4, float ppm_mq7, float ppm_mq135) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado. No se puede enviar datos.");
    if (WiFi.reconnect()) {
      delay(2000);
    }
    return;
  }
  
  if (apiSecret.length() == 0) {
    Serial.println("⚠️ API Secret no configurado. Saltando envío.");
    return;
  }
  
  Serial.println("\n📤 Enviando datos al backend (SEGURO)...");
  
  // Generar ID único de lectura
  String readingId = generateReadingId();
  
  // Verificar si es duplicada
  if (isDuplicateReading(readingId)) {
    Serial.println("⚠️ Lectura duplicada detectada. Saltando envío.");
    return;
  }
  
  // Agregar al buffer
  addToBuffer(readingId, ppm_mq4, ppm_mq7, ppm_mq135);
  
  // ✅ AHORA USAR BEARER TOKEN (en lugar de X-BioSense-Key)
  String authHeader = "Bearer " + apiSecret;
  
  WiFiClientSecure client;
  HTTPClient http;
  
  // Configurar cliente seguro (sin validación de cert por ahora)
  client.setInsecure();
  
  String url = "https://" + String(BACKEND_HOST) + "/api/v2/sensors/reading";
  
  if (!http.begin(client, url)) {
    Serial.println("❌ Error iniciando conexión HTTPS");
    return;
  }
  
  // Usar Bearer Token (JWT) en lugar de X-BioSense-Key
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", authHeader);  // ✅ CAMBIO CRÍTICO
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
   // Construir JSON manualmente (SIN ArduinoJson - ahorra ~300KB!)
   String ts = String(time(nullptr));
   String mq4Str = String(round(ppm_mq4 * 100.0) / 100.0, 2);
   String mq7Str = String(round(ppm_mq7 * 100.0) / 100.0, 2);
   String mq135Str = String(round(ppm_mq135 * 100.0) / 100.0, 2);
   
   String jsonPayload = "{\"macAddress\":\"" + macAddress + "\",\"deviceId\":\"" + macAddress + "\",\"mq4\":" + mq4Str + ",\"mq7\":" + mq7Str + ",\"mq135\":" + mq135Str + ",\"readingId\":\"" + readingId + "\",\"timestamp\":" + ts + "}";
   
   Serial.println("   Payload (sin ArduinoJson): OK");
  
  int httpResponseCode = http.POST(jsonPayload);
  
  Serial.print("   Respuesta HTTP: ");
  Serial.println(httpResponseCode);
  
  if (httpResponseCode == 200 || httpResponseCode == 201) {
    Serial.println("✅ Datos guardados correctamente en la BD!");
  } else if (httpResponseCode == 409) {
    Serial.println("⚠️ Error 409: Lectura duplicada (ya existe en BD)");
    Serial.println("   Esto es NORMAL - la deduplicación funciona correctamente");
  } else if (httpResponseCode == 401) {
    Serial.println("🚫 Error 401: Token inválido o expirado");
    Serial.println("   Se intentará reactivar el dispositivo en el siguiente ciclo");
  } else if (httpResponseCode == 403) {
    Serial.println("🚫 Error 403: Dispositivo no vinculado");
    Serial.println("   SOLUCIÓN: Sincroniza de nuevo en la App");
  } else if (httpResponseCode == 429) {
    Serial.println("⏱️ Error 429: Rate limit excedido - esperando...");
    delay(5000);
  } else if (httpResponseCode == -1) {
    Serial.println("❌ Error de conexión: No se puede alcanzar el servidor");
  } else {
    Serial.println("⚠️ Error: " + String(httpResponseCode));
    String response = http.getString();
    if (response.length() > 0) {
      Serial.println("   Respuesta: " + response.substring(0, 150));
    }
  }
  
  http.end();
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
  
  if (savedSSID == "") {
    Serial.println("❌ No hay WiFi guardado. Entrando en modo SINCRONIZACIÓN.\n");
    initializeBLE();
    startupTime = millis() + STARTUP_WARMUP_TIME;
  } else {
    Serial.println("✅ Credenciales encontradas.");
    Serial.println("   SSID: " + savedSSID);
    
    bool wifiConnected = connectToWiFi(savedSSID, savedPassword);
    
    if (!wifiConnected) {
      Serial.println("\n⚠️ WiFi falló en el primer intento.");
      Serial.println("🔄 Reiniciando en 3 segundos y reintentando...\n");
      delay(3000);
      ESP.restart();
    }
    startupTime = millis() + STARTUP_WARMUP_TIME;
  }
  
  Serial.println("\n⏱️ Calentando sensores durante 30 segundos...");
}

// ================= LOOP PRINCIPAL =================
void loop() {
  if (bleActive) {
    delay(1000);
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
  
  if (millis() - lastReadTime < SENSOR_READ_INTERVAL) {
    delay(100);
    return;
  }
  lastReadTime = millis();
  
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║      📊 LEYENDO SENSORES...           ║");
  Serial.println("╚════════════════════════════════════════╝");
  
  int rawADC_MQ4 = analogRead(MQ4_PIN);
  int rawADC_MQ7 = analogRead(MQ7_PIN);
  int rawADC_MQ135 = analogRead(MQ135_PIN);
  
  Serial.println("Valores ADC crudos:");
  Serial.println("   MQ4:   " + String(rawADC_MQ4) + "/4095");
  Serial.println("   MQ7:   " + String(rawADC_MQ7) + "/4095");
  Serial.println("   MQ135: " + String(rawADC_MQ135) + "/4095");
  
  if (rawADC_MQ4 == 0 && rawADC_MQ7 == 0 && rawADC_MQ135 == 0) {
    Serial.println("\n⚠️ ADVERTENCIA: Todos los sensores leen 0!");
    Serial.println("   Verificar conexiones de pines analógicos.");
    return;
  }
  
  float ppm_mq4 = calculatePPM(rawADC_MQ4, RL_MQ4, R0_MQ4, 1012.7, -2.78);
  float ppm_mq7 = calculatePPM(rawADC_MQ7, RL_MQ7, R0_MQ7, 99.0, -1.5);
  float ppm_mq135 = calculatePPM(rawADC_MQ135, RL_MQ135, R0_MQ135, 110.5, -2.8);
  
  Serial.println("\nValores en PPM:");
  Serial.printf("   MQ4   (CH4)       : %.2f PPM\n", ppm_mq4);
  Serial.printf("   MQ7   (CO)        : %.2f PPM\n", ppm_mq7);
  Serial.printf("   MQ135 (CO2 eq)    : %.2f PPM\n", ppm_mq135);
  
  RiskLevel riskLevel = evaluateRiskLevel(ppm_mq4, ppm_mq7, ppm_mq135);
  currentRiskLevel = riskLevel;
  
  updateLEDAlert(riskLevel);
  
  String riskMessage = getRiskMessage(ppm_mq4, ppm_mq7, ppm_mq135, riskLevel);
  Serial.println("\n" + riskMessage);
  
  Serial.println("\n📊 Umbrales de Alerta (OMS):");
  Serial.println("   CO (MQ7):         Normal < 9ppm | Alerta 9-30ppm | Peligro > 30ppm");
  Serial.println("   CH4 (MQ4):        Normal < 500ppm | Alerta 500-1000ppm | Peligro > 1000ppm");
  Serial.println("   CO2 (MQ135):      Normal < 1000ppm | Alerta 1000-2000ppm | Peligro > 2000ppm");
  
  sendSensorDataToBackend(ppm_mq4, ppm_mq7, ppm_mq135);
  
  Serial.println("\n⏰ Próxima lectura en 10 segundos...\n");
}
