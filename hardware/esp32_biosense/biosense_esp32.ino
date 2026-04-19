#include <WiFi.h>
#include <HTTPClient.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include <math.h>

// ================= CONFIGURACIÓN PINES =================
// Pines Analógicos (Sensores)
#define MQ4_PIN   35    // GPIO 35 (ADC1_CH7)
#define MQ7_PIN   34    // GPIO 34 (ADC1_CH6)
#define MQ135_PIN 32    // GPIO 32 (ADC1_CH4)

// Pines Digitales (LEDs de Alerta)
#define LED_GREEN  25   // GPIO 25 - LED Verde (Aire Sano)
#define LED_ORANGE 26   // GPIO 26 - LED Naranja (Moderado)
#define LED_RED    27   // GPIO 27 - LED Rojo (Peligro)

// ================= BLE CONFIG =================
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ================= VARIABLES GLOBALES =================
Preferences preferences;
bool bleActive = false;
String macAddress = "";
String apiSecret = "";

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
  SAFE = 0,      // Verde
  WARNING = 1,   // Naranja
  DANGER = 2     // Rojo
};

RiskLevel currentRiskLevel = SAFE;

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
  // ===== MONÓXIDO DE CARBONO (MQ7) =====
  if (ppmMQ7 > 30) {
    return DANGER;
  } else if (ppmMQ7 > 9) {
    return WARNING;
  }
  
  // ===== METANO (MQ4) =====
  if (ppmMQ4 > 1000) {
    return DANGER;
  } else if (ppmMQ4 > 500) {
    return WARNING;
  }
  
  // ===== CALIDAD DE AIRE (MQ135) =====
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
  
  // MQ7 (CO)
  if (ppmMQ7 > 30) {
    details += "🔴 CO CRÍTICO (" + String(ppmMQ7, 1) + " ppm) | ";
  } else if (ppmMQ7 > 9) {
    details += "🟡 CO ELEVADO (" + String(ppmMQ7, 1) + " ppm) | ";
  } else {
    details += "🟢 CO NORMAL (" + String(ppmMQ7, 1) + " ppm) | ";
  }
  
  // MQ4 (CH4)
  if (ppmMQ4 > 1000) {
    details += "🔴 CH4 CRÍTICO (" + String(ppmMQ4, 1) + " ppm) | ";
  } else if (ppmMQ4 > 500) {
    details += "🟡 CH4 ELEVADO (" + String(ppmMQ4, 1) + " ppm) | ";
  } else {
    details += "🟢 CH4 NORMAL (" + String(ppmMQ4, 1) + " ppm) | ";
  }
  
  // MQ135 (CO2)
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
  // Apagar todos los LEDs primero
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_ORANGE, LOW);
  digitalWrite(LED_RED, LOW);
  
  // Encender el LED correspondiente
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

// ================= CLASE BLE CALLBACKS ✅ CORREGIDA DEFINITIVAMENTE =================
class BLECallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    // ✅ CORREGIDO: Usar getLength() y getData() en lugar de getValue()
    uint8_t* data = pCharacteristic->getData();
    size_t len = pCharacteristic->getLength();
    
    if (len > 0 && data != nullptr) {
      // ✅ Convertir uint8_t array a String
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
        
        // Crear una máscara para la contraseña
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
        
        Serial.println("\n✅ Credenciales guardadas en memoria NVS.");
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
  
  // Inicializar BLE
  BLEDevice::init(bleName.c_str());
  BLEDevice::setMTU(517);
  
  // Crear servidor
  BLEServer *pServer = BLEDevice::createServer();
  if (!pServer) {
    Serial.println("❌ FALLO: No se pudo crear servidor BLE");
    return;
  }
  
  // Crear servicio
  BLEService *pService = pServer->createService(SERVICE_UUID);
  if (!pService) {
    Serial.println("❌ FALLO: No se pudo crear servicio BLE");
    return;
  }
  
  // Crear característica
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
  
  // Configurar callback y valor inicial
  pCharacteristic->setCallbacks(new BLECallbacks());
  pCharacteristic->setValue(macAddress.c_str());
  
  // Agregar descriptor para notificaciones
  pCharacteristic->addDescriptor(new BLE2902());
  
  // Iniciar servicio
  pService->start();
  
  // Configurar advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setAdvertisementType(ADV_TYPE_IND);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  
  // Iniciar advertising
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

// ================= FUNCIÓN: Enviar Datos al Backend =================
void sendSensorDataToBackend(float ppm_mq4, float ppm_mq7, float ppm_mq135) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado. No se puede enviar datos.");
    Serial.println("   Intentando reconectar...");
    return;
  }
  
  if (apiSecret.length() == 0) {
    Serial.println("⚠️ API Secret no configurado. Saltando envío.");
    Serial.println("   SOLUCIÓN: Sincroniza el dispositivo en la App.");
    return;
  }
  
  Serial.println("\n📤 Enviando datos al backend...");
  
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-BioSense-Key", apiSecret);
  
  String jsonPayload = "{";
  jsonPayload += "\"macAddress\":\"" + macAddress + "\",";
  jsonPayload += "\"mq4\":" + String(ppm_mq4, 2) + ",";
  jsonPayload += "\"mq7\":" + String(ppm_mq7, 2) + ",";
  jsonPayload += "\"mq135\":" + String(ppm_mq135, 2);
  jsonPayload += "}";
  
  Serial.println("   Payload: " + jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);
  
  Serial.print("   Respuesta HTTP: ");
  Serial.println(httpResponseCode);
  
  if (httpResponseCode == 403) {
    Serial.println("🚫 Error 403: Hardware no vinculado o API Secret inválido.");
    Serial.println("   SOLUCIÓN: Sincroniza el dispositivo en la App nuevamente.");
  } else if (httpResponseCode == -1) {
    Serial.println("❌ Error de conexión: No se puede alcanzar el servidor.");
    Serial.println("   Verifica tu conexión WiFi.");
  } else if (httpResponseCode >= 200 && httpResponseCode < 300) {
    Serial.println("✅ Datos guardados en la base de datos!");
  } else {
    Serial.println("⚠️ Error en la respuesta del servidor: " + String(httpResponseCode));
    if (http.getString().length() > 0) {
      Serial.println("   Respuesta: " + http.getString());
    }
  }
  
  http.end();
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║     🔥 BIOSENSE IoT - INICIALIZACIÓN  ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  // ===== 1. CONFIGURAR PINES DIGITALES =====
  Serial.println("⚙️ Configurando pines digitales de LEDs...");
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_ORANGE, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  
  // Apagar todos los LEDs inicialmente
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_ORANGE, LOW);
  digitalWrite(LED_RED, LOW);
  
  Serial.println("   ✅ Pines configurados:");
  Serial.println("      GPIO 25 = LED Verde (Aire Sano)");
  Serial.println("      GPIO 26 = LED Naranja (Moderado)");
  Serial.println("      GPIO 27 = LED Rojo (Peligro)");
  
  // ===== 2. CONFIGURAR ADC =====
  Serial.println("\n⚙️ Configurando ADC...");
  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);
  Serial.println("   ✅ ADC configurado para 12 bits (0-4095 = 0-3.3V)");
  
  // ===== 3. OBTENER MAC ADDRESS =====
  macAddress = WiFi.macAddress();
  Serial.println("\n📍 MAC Address del dispositivo: " + macAddress);
  
  // ===== 4. CARGAR CREDENCIALES =====
  Serial.println("\n🔐 Cargando credenciales del almacenamiento NVS...");
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
  // Si estamos en modo BLE, no hacer nada
  if (bleActive) {
    delay(1000);
    return;
  }
  
  // Durante el calentamiento inicial
  if (millis() < startupTime) {
    unsigned long remainingTime = (startupTime - millis()) / 1000;
    if (remainingTime % 5 == 0) {
      Serial.print("⏳ " + String(remainingTime) + "s...");
    }
    delay(500);
    return;
  }
  
  // Leer sensores cada SENSOR_READ_INTERVAL
  if (millis() - lastReadTime < SENSOR_READ_INTERVAL) {
    delay(100);
    return;
  }
  lastReadTime = millis();
  
  // ===== LEER ADC =====
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
  
  // Validar lecturas
  if (rawADC_MQ4 == 0 && rawADC_MQ7 == 0 && rawADC_MQ135 == 0) {
    Serial.println("\n⚠️ ADVERTENCIA: Todos los sensores leen 0!");
    Serial.println("   Verificar conexiones de pines analógicos.");
    return;
  }
  
  // ===== CONVERTIR A PPM =====
  float ppm_mq4 = calculatePPM(rawADC_MQ4, RL_MQ4, R0_MQ4, 1012.7, -2.78);
  float ppm_mq7 = calculatePPM(rawADC_MQ7, RL_MQ7, R0_MQ7, 99.0, -1.5);
  float ppm_mq135 = calculatePPM(rawADC_MQ135, RL_MQ135, R0_MQ135, 110.5, -2.8);
  
  Serial.println("\nValores en PPM:");
  Serial.printf("   MQ4   (CH4)       : %.2f PPM\n", ppm_mq4);
  Serial.printf("   MQ7   (CO)        : %.2f PPM\n", ppm_mq7);
  Serial.printf("   MQ135 (CO2 eq)    : %.2f PPM\n", ppm_mq135);
  
  // ===== EVALUAR RIESGO =====
  RiskLevel riskLevel = evaluateRiskLevel(ppm_mq4, ppm_mq7, ppm_mq135);
  currentRiskLevel = riskLevel;
  
  // ===== ACTUALIZAR LEDS =====
  updateLEDAlert(riskLevel);
  
  // ===== MOSTRAR MENSAJE DETALLADO =====
  String riskMessage = getRiskMessage(ppm_mq4, ppm_mq7, ppm_mq135, riskLevel);
  Serial.println("\n" + riskMessage);
  
  // ===== MOSTRAR UMBRALES =====
  Serial.println("\n📊 Umbrales de Alerta (OMS):");
  Serial.println("   CO (MQ7):         Normal < 9ppm | Alerta 9-30ppm | Peligro > 30ppm");
  Serial.println("   CH4 (MQ4):        Normal < 500ppm | Alerta 500-1000ppm | Peligro > 1000ppm");
  Serial.println("   CO2 (MQ135):      Normal < 1000ppm | Alerta 1000-2000ppm | Peligro > 2000ppm");
  
  // ===== ENVIAR A BACKEND =====
  sendSensorDataToBackend(ppm_mq4, ppm_mq7, ppm_mq135);
  
  // ===== SIGUIENTE LECTURA =====
  Serial.println("\n⏰ Próxima lectura en 10 segundos...\n");
}