/**
 * ESP32 BioSense - FACTORY RESET
 * 
 * 🔧 USE ESTE CÓDIGO PARA LIMPIAR TODAS LAS CREDENCIALES GUARDADAS
 * 
 * ¿Cuándo usar?
 * - Cuando el ESP32 no aparece en Bluetooth
 * - Cuando necesitas volver a sincronizar
 * - Cuando las credenciales guardadas están corruptas
 * 
 * ¿Cómo usar?
 * 1. Abre este archivo en Arduino IDE
 * 2. Selecciona tu ESP32 board (Tools > Board > ESP32 Dev Module)
 * 3. Selecciona el puerto (Tools > Port)
 * 4. Compila y carga (Upload)
 * 5. Abre Serial Monitor (115200 baud) para ver progreso
 * 6. Espera 5 segundos y verás "✅ FACTORY RESET COMPLETE"
 * 7. ¡Carga nuevamente biosense_esp32_SECURE.ino cuando termine!
 * 
 * El ESP32 se reiniciará automáticamente y buscará
 * credenciales guardadas. Como no encontrará ninguna,
 * iniciará BLE automáticamente.
 */

#include <Preferences.h>

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║    🔧 ESP32 FACTORY RESET TOOL        ║");
  Serial.println("║       Borrando credenciales guardadas   ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  Serial.println("⚠️  INICIANDO FACTORY RESET...\n");
  
  // Acceso a Preferences para leer/escribir
  Preferences prefs;
  
  // Abre el namespace "biosense" en modo lectura-escritura
  prefs.begin("biosense", false);
  
  // Obtener claves antes de borrar (para informar al usuario)
  String ssid = prefs.getString("ssid", "");
  String api_secret = prefs.getString("api_secret", "");
  uint32_t boot_count = prefs.getUInt("boot_count", 0);
  
  Serial.println("📋 INFORMACIÓN ANTES DE BORRAR:");
  Serial.println("   - SSID guardado: " + (ssid.length() > 0 ? ssid : "(ninguno)"));
  Serial.println("   - API Secret: " + (api_secret.length() > 0 ? "✓ Configurado" : "(ninguno)"));
  Serial.println("   - Boot counter: " + String(boot_count));
  
  Serial.println("\n🗑️  BORRANDO TODO EL NAMESPACE 'biosense'...");
  
  // OPCIÓN 1: Borrar toda el namespace (recomendado)
  bool cleared = prefs.clear();
  
  if (cleared) {
    Serial.println("✅ Namespace completamente borrado");
  } else {
    Serial.println("⚠️  No se pudo borrar el namespace");
  }
  
  // Cierra el namespace
  prefs.end();
  
  // Verificar que está vacío
  prefs.begin("biosense", true);  // Modo lectura para verificar
  String verify_ssid = prefs.getString("ssid", "");
  String verify_secret = prefs.getString("api_secret", "");
  prefs.end();
  
  Serial.println("\n✅ VERIFICACIÓN POST-RESET:");
  Serial.println("   - SSID después: " + (verify_ssid.length() > 0 ? verify_ssid : "❌ BORRADO ✓"));
  Serial.println("   - API Secret después: " + (verify_secret.length() > 0 ? verify_secret : "❌ BORRADO ✓"));
  
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║   ✅ FACTORY RESET COMPLETADO          ║");
  Serial.println("║                                        ║");
  Serial.println("║  📝 PRÓXIMOS PASOS:                    ║");
  Serial.println("║  1. Carga biosense_esp32_SECURE.ino   ║");
  Serial.println("║  2. El ESP32 iniciará en modo BLE     ║");
  Serial.println("║  3. Abre la app y busca dispositivo   ║");
  Serial.println("║     nombre: 'BioSense-XXXXX'          ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  delay(5000);
  
  Serial.println("🔄 Reiniciando ESP32 en 3 segundos...");
  delay(3000);
  ESP.restart();
}

void loop() {
  // No hace nada - el setup() es suficiente
  delay(1000);
}
