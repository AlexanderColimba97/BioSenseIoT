/**
 * ESP32 BioSense - OPCIÓN 2: WiFi HARDCODEADO
 * 
 * Ventajas:
 * ✅ Funciona apenas enciendes el ESP32 (5 seg calibración)
 * ✅ NO necesita sincronización BLE
 * ✅ Simple y rápido de implementar
 * ✅ Perfecto para testing o redes privadas
 * 
 * Desventajas:
 * ❌ Si la WiFi cambia, necesitas reprogramar
 * ❌ Credenciales en texto plano en el código
 * 
 * INSTALACIÓN:
 * 1. Edita las credenciales abajo (SSID y PASSWORD)
 * 2. Copia esta función a biosense_esp32_SECURE.ino
 * 3. En setup(), reemplaza:
 *      if (savedSSID == "") {
 *        initializeBLE();
 *      }
 *    Por:
 *      if (savedSSID == "") {
 *        // Usar WiFi hardcodeado
 *        savedSSID = HARDCODED_SSID;
 *        savedPassword = HARDCODED_PASSWORD;
 *      }
 */

// ============================================
// ⬇️ EDITA ESTAS CREDENCIALES ⬇️
// ============================================
#define HARDCODED_SSID "Mi-Red-WiFi"          // Tu SSID WiFi
#define HARDCODED_PASSWORD "MiContraseña123"  // Tu contraseña WiFi
#define HARDCODED_API_SECRET "secret123"      // Tu API Secret de BioSense (opcional)
// ============================================

/**
 * MODIFICACIÓN EN setup() - Línea ~575
 * 
 * CAMBIAR ESTO:
 * 
 * if (savedSSID == "") {
 *   Serial.println("❌ No hay WiFi guardado. Entrando en modo SINCRONIZACIÓN.\n");
 *   initializeBLE();
 *   startupTime = millis() + STARTUP_WARMUP_TIME;
 * } else {
 *   Serial.println("✅ Credenciales encontradas.");
 *   Serial.println("   SSID: " + savedSSID);
 *   ...
 * }
 * 
 * POR ESTO:
 */

// ============= VERSIÓN MODIFICADA =============
void setup_MODIFIED() {
  // ... (código anterior igual)
  
  Serial.println("\n🔐 Cargando credenciales...");
  preferences.begin("biosense", true);
  String savedSSID = preferences.getString("ssid", "");
  String savedPassword = preferences.getString("password", "");
  apiSecret = preferences.getString("api_secret", "");
  preferences.end();
  
  // 👇 NUEVA LÓGICA: Si no hay WiFi guardado, usar hardcodeado
  if (savedSSID == "") {
    Serial.println("📡 No hay WiFi guardado.");
    Serial.println("🔧 Usando credenciales hardcodeadas...\n");
    
    savedSSID = HARDCODED_SSID;
    savedPassword = HARDCODED_PASSWORD;
    apiSecret = HARDCODED_API_SECRET;
    
    // Opcional: Guardar en Preferences para futuras lecturas
    preferences.begin("biosense", false);
    preferences.putString("ssid", savedSSID);
    preferences.putString("password", savedPassword);
    preferences.putString("api_secret", apiSecret);
    preferences.end();
    
    Serial.println("✅ Credenciales cargadas (hardcodeadas)");
  } else {
    Serial.println("✅ Credenciales encontradas en memoria.");
  }
  
  Serial.println("   SSID: " + savedSSID);
  
  bool wifiConnected = connectToWiFi(savedSSID, savedPassword);
  
  if (!wifiConnected) {
    Serial.println("\n⚠️ WiFi falló. Reiniciando en 3 segundos...\n");
    delay(3000);
    ESP.restart();
  }
  
  startupTime = millis() + STARTUP_WARMUP_TIME;
  
  Serial.println("\n⏱️ Calentando sensores durante 30 segundos...");
}

// ============= BENEFICIO ADICIONAL: BLE COMO RESPALDO =============
/**
 * Si quieres que si falla WiFi, vuelva a modo BLE para re-sincronizar:
 * 
 * Reemplaza en setup():
 * 
 * if (!wifiConnected) {
 *   Serial.println("\n⚠️ WiFi falló.");
 *   Serial.println("🔄 Iniciando BLE de respaldo para re-sincronizar...\n");
 *   initializeBLE();
 *   startupTime = millis() + STARTUP_WARMUP_TIME;
 * }
 */

// ============= CAMBIO EN loop() =============
/**
 * Si usas BLE de respaldo, también necesitas comentar esto en loop():
 * 
 * Línea ~625:
 * 
 * CAMBIAR:
 * void loop() {
 *   if (bleActive) {
 *     delay(1000);
 *     return;  // ← Si BLE está activo, no envía sensores
 *   }
 *   ...
 * }
 * 
 * POR (sin cambiar nada si solo usas WiFi hardcodeado):
 * - Si combinas con BLE de respaldo, déjalo como está
 */
