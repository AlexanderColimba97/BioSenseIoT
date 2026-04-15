#include <WiFi.h>
#include <HTTPClient.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include <math.h>

// ================= CONFIG =================
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

#define MQ4_PIN   35
#define MQ7_PIN   34
#define MQ135_PIN 32

Preferences preferences;

bool bleActive = false;
String macAddress = "";
String apiSecret = "sk_prod_biosense123xyz";

// ================= SENSOR CALIBRATION (APPROX) =================
// Resistencias de Carga en los módulos típicos (10k a 20k ohm)
const float RL_MQ4   = 20.0; 
const float R0_MQ4   = 10.0; // Valor nominal de estimación
const float RL_MQ7   = 10.0;
const float R0_MQ7   = 10.0;
const float RL_MQ135 = 20.0;
const float R0_MQ135 = 10.0;

// ================= SENSOR CONVERSION =================
// Fórmulas potencia PPM = a * (Rs/R0)^b extraídas de datasheets comunes
float calculatePPM(int adcValue, float RL, float R0, float a, float b) {
  if (adcValue <= 0) return 0.0;
  
  // ESP32 ADC: 12 bits (4095) y 3.3V
  float voltage = adcValue * (3.3 / 4095.0);
  if (voltage >= 3.3) voltage = 3.29; // Prevenir división por cero
  
  // Calcular Rs (Resistencia del sensor)
  float Rs = ((3.3 * RL) / voltage) - RL;
  
  float ratio = Rs / R0;
  float ppm = a * pow(ratio, b);
  
  return ppm;
}

// Evaluar riesgo según directrices de la OMS
String evaluateRisk(float ppmMQ4, float ppmMQ7, float ppmMQ135) {
  bool danger = false;
  bool alert = false;
  
  // MQ7 (CO - Monóxido de Carbono). OMS alerta por encima de 9ppm en 8h, peligro a 30ppm.
  if (ppmMQ7 > 30) danger = true;
  else if (ppmMQ7 > 9) alert = true;
  
  // MQ4 (Metano CH4). LEL es 50,000 ppm. Alertas preventivas suelen ir de 500 a 1000.
  if (ppmMQ4 > 1000) danger = true;
  else if (ppmMQ4 > 500) alert = true;
  
  // MQ135 (Calidad de Aire / CO2 equivalente). OMS/ASHRAE: Normal hasta 1000. Peligro > 2000.
  if (ppmMQ135 > 2000) danger = true;
  else if (ppmMQ135 > 1000) alert = true;
  
  if (danger) return "PELIGRO (Nivel alto detectado)";
  if (alert) return "ALERTA (Nivel moderado de gases)";
  return "NORMAL (Aire limpio y seguro)";
}

// ================= BLE CALLBACK =================
class MyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();

    if (value.length() > 0) {
      String payload = String(value.c_str());
      Serial.println("📥 BLE recibido: " + payload);

      int separatorIdx = payload.indexOf(',');
      if (separatorIdx > 0) {
        String ssid = payload.substring(0, separatorIdx);
        String pass = payload.substring(separatorIdx + 1);

        preferences.begin("wifi_creds", false);
        preferences.putString("ssid", ssid);
        preferences.putString("pass", pass);
        preferences.end();   

        Serial.println("✅ Credenciales guardadas desde la App. Reiniciando el ESP32 para conectarse al WiFi...");
        delay(1000);
        ESP.restart();
      } else {
        Serial.println("❌ Formato incorrecto. Se esperaba: SSID,PASSWORD");
      }
    }
  }
};

// ================= BLE =================
void startBLE() {
  bleActive = true;

  BLEDevice::init("BioSense-" + macAddress.substring(12, 17));
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE
  );

  pCharacteristic->setCallbacks(new MyCallbacks());
  pCharacteristic->setValue(macAddress.c_str());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  
  BLEDevice::startAdvertising();

  Serial.println("📡 MODO CONFIGURACION: BLE activo.");
  Serial.println("📱 POR FAVOR ABRE LA APP MÓVIL, VE A 'MI PERFIL' -> 'SINCRONIZAR' Y ENVÍA EL WIFI DESDE AHÍ.");
}

// ================= WIFI =================
void connectWiFi(String ssid, String pass) {
  Serial.println("📶 Conectando a WiFi: " + ssid);
  WiFi.begin(ssid.c_str(), pass.c_str());
  
  int retries = 0;
  while(WiFi.status() != WL_CONNECTED && retries < 20) {
     delay(500);
     Serial.print(".");
     retries++;
  }
  
  if(WiFi.status() != WL_CONNECTED) {
     Serial.println("\n❌ No se pudo conectar. Iniciando BLE de contingencia.");
     startBLE();
  } else {
     Serial.println("\n✅ WiFi conectado exitosamente!");
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n🔥 ===== BOOT BIO SENSE =====");

  analogSetAttenuation(ADC_11db); // Rango completo 0 - 3.3V para 12-bits (0-4095)

  macAddress = WiFi.macAddress();
  Serial.println("📍 MAC: " + macAddress);

  preferences.begin("wifi_creds", true);
  String ssid = preferences.getString("ssid", "");
  String pass = preferences.getString("pass", "");
  preferences.end();

  if (ssid == "") {
    Serial.println("⚙️ No hay configuración WiFi guardada. Entrando en modo Sincronización.");
    startBLE();
  } else {
    connectWiFi(ssid, pass);
  }
}

// ================= LOOP =================
void loop() {
  if (bleActive) {
      delay(1000);
      return; 
  }

  Serial.println("\n🔁 LOOP NORMAL - LEYENDO SENSORES");

  // ===== 1. LEER ADC BRUTO =====
  int adc_mq4 = analogRead(MQ4_PIN);
  int adc_mq7 = analogRead(MQ7_PIN);
  int adc_mq135 = analogRead(MQ135_PIN);

  if (adc_mq4 == 0 && adc_mq7 == 0 && adc_mq135 == 0) {
    Serial.println("⚠️ POSIBLE ERROR DE HARDWARE CON LOS PINES ANALÓGICOS");
  }

  // ===== 2. CONVERTIR A PPM =====
  // Curvas aproximadas: 
  // MQ4 (Metano CH4): a = 1012.7, b = -2.78
  // MQ7 (CO): a = 99.0, b = -1.5
  // MQ135 (CO2 equ.): a = 110.5, b = -2.8
  float ppm_mq4 = calculatePPM(adc_mq4, RL_MQ4, R0_MQ4, 1012.7, -2.78);
  float ppm_mq7 = calculatePPM(adc_mq7, RL_MQ7, R0_MQ7, 99.0, -1.5);
  float ppm_mq135 = calculatePPM(adc_mq135, RL_MQ135, R0_MQ135, 110.5, -2.8);

  // ===== 3. EVALUACIÓN DE LA OMS =====
  String riskStatus = evaluateRisk(ppm_mq4, ppm_mq7, ppm_mq135);

  Serial.println("📊 Datos BioSense IoT (Umbrales OMS):");
  Serial.printf("  - MQ4   (CH4)  : %.2f PPM\n", ppm_mq4);
  Serial.printf("  - MQ7   (CO)   : %.2f PPM\n", ppm_mq7);
  Serial.printf("  - MQ135 (CO2Eq): %.2f PPM\n", ppm_mq135);
  Serial.println("🚨 Estado Actual: " + riskStatus);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado. Intentando reconexión en el próximo ciclo.");
  } else {
    // ===== 4. ENVÍO A BACKEND Y VINCULACIÓN =====
    HTTPClient http;
    http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-BioSense-Key", apiSecret);

    String payload = "{";
    payload += "\"macAddress\":\"" + macAddress + "\",";
    payload += "\"mq4\":" + String(ppm_mq4, 2) + ",";
    payload += "\"mq7\":" + String(ppm_mq7, 2) + ",";
    payload += "\"mq135\":" + String(ppm_mq135, 2);
    payload += "}";

    Serial.println("📤 Post Payload: " + payload);

    int httpResponseCode = http.POST(payload);

    Serial.print("🌐 HTTP Respuesta desde Railway: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode == 403) {
      Serial.println("🚫 Error 403: Hardware no vinculado. Abre la App 'Mi Perfil' -> 'Sincronizar' para adjuntar este equipo a tu cuenta.");
    } else if (httpResponseCode >= 200 && httpResponseCode < 300) {
      Serial.println("✅ LECTURA GUARDADA EXITOSAMENTE EN LA DB.");
    } else {
      Serial.println("⚠️ Error genérico desde el servidor: " + String(httpResponseCode));
    }

    http.end();
  }

  // 10 Segundos antes del próximo muestreo
  delay(10000); 
}
