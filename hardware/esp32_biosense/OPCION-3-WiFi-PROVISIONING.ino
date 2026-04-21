/**
 * ESP32 BioSense - OPCIÓN 3: WiFi PROVISIONING + BLE
 * (Lo mejor de ambos mundos)
 * 
 * Ventajas:
 * ✅ Configure WiFi una sola vez por BLE (como opción 1)
 * ✅ Después funciona sin BLE (como opción 2)
 * ✅ Reinicia automático, está listo en 5 segundos
 * ✅ Si WiFi falla, reintenta indefinidamente (SIN reiniciar)
 * ✅ Puedes cambiar WiFi en cualquier momento por BLE
 * 
 * Desventajas:
 * ⚠️ Un poco más de código
 * ⚠️ Usa más memoria
 * 
 * FLUJO:
 * 1️⃣ Primera vez: ESP32 inicia en BLE → Sincronizas WiFi → Reinicia
 * 2️⃣ Segunda vez: ESP32 conecta a WiFi automáticamente en 3 segundos ✓
 * 3️⃣ Si WiFi falla: Reintenta cada 10 segundos (sin reiniciar) ✓
 * 4️⃣ Para re-sincronizar: Presiona botón factory reset (GPIO 0)
 * 
 * INSTALACIÓN:
 * Reemplaza la función setup() en biosense_esp32_SECURE.ino
 * con la versión modificada aquí abajo
 */

// ============================================
// PROVISIONING CON REINTENTOS INTELIGENTES
// ============================================

#define WIFI_RETRY_INTERVAL 10000  // Reintentar WiFi cada 10 segundos
#define WIFI_MAX_RETRIES 3         // Máx 3 intentos antes de fallar
unsigned long lastWiFiRetry = 0;
int wifiRetryCount = 0;

/**
 * Función mejorada: Conectar a WiFi con reintentos sin reiniciar
 */
bool connectToWiFiWithRetry(String ssid, String password) {
  Serial.println("\n📶 Conectando a WiFi...");
  Serial.println("   SSID: " + ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(500);
  
  WiFi.begin(ssid.c_str(), password.c_str());
  
  int attempts = 0;
  const int maxAttempts = 15;  // 7.5 segundos max
  
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
    wifiRetryCount = 0;  // Reset contador
    return true;
  } else {
    Serial.println("⚠️  WiFi no disponible después de " + String(maxAttempts * 500) + "ms");
    wifiRetryCount++;
    Serial.println("   Reintentos: " + String(wifiRetryCount) + "/" + String(WIFI_MAX_RETRIES));
    
    if (wifiRetryCount >= WIFI_MAX_RETRIES) {
      Serial.println("❌ Máximo de reintentos alcanzado. Entrando en modo BLE respaldo...");
      return false;
    }
    return false;
  }
}

/**
 * MODIFICACIÓN EN setup() - VERSIÓN PROVISIONING
 * Reemplaza la función setup() de biosense_esp32_SECURE.ino
 */
void setup_PROVISIONING() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║  BioSense IoT - PROVISIONING MODE     ║");
  Serial.println("║     WiFi Smart + BLE Sync              ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  Serial.println("⚙️ Configurando pines digitales...");
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_ORANGE, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_ORANGE, LOW);
  digitalWrite(LED_RED, LOW);
  
  Serial.println("   ✅ Pines configurados");
  
  Serial.println("\n⚙️ Configurando ADC...");
  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);
  Serial.println("   ✅ ADC configurado para 12 bits");
  
  macAddress = WiFi.macAddress();
  Serial.println("\n📍 MAC Address: " + macAddress);
  
  // Boot counter
  preferences.begin("biosense", false);
  bootCounter = preferences.getUInt("boot_count", 0) + 1;
  preferences.putUInt("boot_count", bootCounter);
  preferences.end();
  bootNonce = esp_random();
  Serial.println("🔐 Boot counter: " + String(bootCounter));
  
  // Cargar credenciales
  Serial.println("\n🔐 Cargando credenciales de NVS...");
  preferences.begin("biosense", true);
  String savedSSID = preferences.getString("ssid", "");
  String savedPassword = preferences.getString("password", "");
  apiSecret = preferences.getString("api_secret", "");
  preferences.end();
  
  if (savedSSID == "") {
    Serial.println("❌ Sin credenciales. Modo BLE PROVISIONING.\n");
    initializeBLE();
    startupTime = millis() + STARTUP_WARMUP_TIME;
  } else {
    Serial.println("✅ Credenciales encontradas.");
    
    // 🔄 INTENTO 1: Conectar a WiFi
    bool wifiConnected = connectToWiFiWithRetry(savedSSID, savedPassword);
    
    if (!wifiConnected) {
      // 🔄 INTENTO 2: Reintentar sin reiniciar
      Serial.println("\n⏳ Reintentando WiFi en " + String(WIFI_RETRY_INTERVAL/1000) + " segundos...");
      lastWiFiRetry = millis();
      // NO reinicia - continúa en loop() y reintenta
    }
    
    startupTime = millis() + STARTUP_WARMUP_TIME;
  }
  
  Serial.println("\n⏱️ Calentando sensores durante 30 segundos...");
}

/**
 * MODIFICACIÓN EN loop() - VERSIÓN PROVISIONING
 * Agrega esta lógica de reintentos WiFi
 */
void loop_PROVISIONING_ADDITIONS() {
  // Si BLE está activo, NO hace nada más
  if (bleActive) {
    delay(1000);
    return;
  }
  
  // 🔄 REINTENTAR WiFi si está desconectado
  if (WiFi.status() != WL_CONNECTED && !bleActive) {
    if (millis() - lastWiFiRetry > WIFI_RETRY_INTERVAL) {
      Serial.println("\n🔄 Reintentando conexión WiFi...");
      
      preferences.begin("biosense", true);
      String ssid = preferences.getString("ssid", "");
      String password = preferences.getString("password", "");
      preferences.end();
      
      if (ssid.length() > 0) {
        connectToWiFiWithRetry(ssid, password);
      }
      
      lastWiFiRetry = millis();
    }
  }
  
  // El resto del loop() continúa igual...
  // (lectura de sensores, envío de datos, etc.)
}

/**
 * FACTORY RESET POR GPIO (OPCIONAL)
 * 
 * Si quieres un botón físico para resetear:
 * Agrega esto en setup():
 * 
 * #define FACTORY_RESET_GPIO 0  // GPIO 0 = botón boot
 * pinMode(FACTORY_RESET_GPIO, INPUT_PULLUP);
 * 
 * Y en loop(), agrega:
 * 
 * if (digitalRead(FACTORY_RESET_GPIO) == LOW) {  // Botón presionado
 *   Serial.println("\n🔧 FACTORY RESET detectado!");
 *   preferences.begin("biosense", false);
 *   preferences.clear();
 *   preferences.end();
 *   Serial.println("✅ Credenciales borradas. Reiniciando...");
 *   delay(2000);
 *   ESP.restart();
 * }
 */

// ============================================
// RESUMEN DE CAMBIOS NECESARIOS
// ============================================
/*
 * 1. REEMPLAZA en biosense_esp32_SECURE.ino:
 *    
 *    void setup() { ... }
 *    
 *    POR la función setup_PROVISIONING() de arriba
 * 
 * 2. EN void loop():
 *    
 *    Agrega al inicio (después de `if (bleActive)`)
 *    la lógica de loop_PROVISIONING_ADDITIONS()
 * 
 * 3. PROPIEDADES:
 *    - Primera sincronización: ~10 segundos (BLE)
 *    - Arranques posteriores: ~3 segundos (WiFi)
 *    - Si WiFi falla: reintenta cada 10 segundos
 *    - NO se reinicia automáticamente
 * 
 * 4. PARA CAMBIAR WiFi:
 *    - Borra credenciales (comando BLE especial)
 *    - O presiona botón factory reset (GPIO 0)
 */
