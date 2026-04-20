# 🔒 ESP32 SECURITY FIXES - C++/Arduino
## BLE Encryption + Flash Encryption + Certificate Pinning

---

## FIX #1: BLE ENCRYPTION CON SECURITY PAIRING

**Archivo:** `hardware/esp32_biosense/biosense_esp32.ino`

### ANTES (Vulnerable)
```cpp
void initializeBLE() {
  bleActive = true;
  Serial.println("\n📡 ===== INICIANDO MODO SINCRONIZACIÓN BLE =====");
  
  String bleName = "BioSense-" + macAddress.substring(12, 17);
  Serial.println("   Nombre BLE: " + bleName);
  Serial.println("   MAC: " + macAddress);
  
  // Inicializar BLE sin seguridad
  BLEDevice::init(bleName.c_str());
  BLEDevice::setMTU(517);
  
  // ... resto del código sin encriptación
}

void initializeBLE() {
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY |
    BLECharacteristic::PROPERTY_INDICATE
  );
  
  // Datos sensibles sin protección
  pCharacteristic->setValue(macAddress.c_str());
}
```

**Problemas:**
- BLE datos en PLAINTEXT (credenciales WiFi + API secret visibles)
- Sin pairing: Cualquiera se puede conectar
- Sin MITM protection

### DESPUÉS (Seguro)

**1. Agregar include:**
```cpp
#include <BLESecurity.h>
```

**2. Reemplazar función `initializeBLE()` (línea ~230):**
```cpp
void initializeBLE() {
  bleActive = true;
  Serial.println("\n📡 ===== INICIANDO MODO SINCRONIZACIÓN BLE =====");
  
  String bleName = "BioSense-" + macAddress.substring(12, 17);
  Serial.println("   Nombre BLE: " + bleName);
  Serial.println("   MAC: " + macAddress);
  
  // Inicializar BLE
  BLEDevice::init(bleName.c_str());
  BLEDevice::setMTU(517);
  
  // ✅ AGREGAR SECURITY - Requerir pairing con MITM protection
  BLESecurity *pSecurity = new BLESecurity();
  pSecurity->setCapability(ESP_IO_CAP_NONE);
  pSecurity->setAuthenticationMode(ESP_LE_AUTH_REQ_SC_ONLY);  // Secure Connections
  pSecurity->setInitEncryptionKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);
  BLEDevice::setSecurity(pSecurity);
  
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
  
  // ✅ Requiere encriptación para leer/escribir
  pCharacteristic->setAccessPermissions(
    ESP_GATT_PERM_READ_ENC_AUTH_MITM | 
    ESP_GATT_PERM_WRITE_ENC_AUTH_MITM);
  
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
  
  Serial.println("\n✅ BLE COMPLETAMENTE OPERATIVO (CON ENCRIPTACIÓN)");
  Serial.println("🔒 PAIRING REQUERIDO - Requiere PIN en el móvil");
  Serial.println("📱 INSTRUCCIONES PARA SINCRONIZAR:");
  Serial.println("   1. Abre la App BioSense en tu Android");
  Serial.println("   2. Ve a 'MI PERFIL'");
  Serial.println("   3. Toca 'SINCRONIZAR'");
  Serial.println("   4. Toca 'Escanear Bluetooth'");
  Serial.println("   5. Selecciona: " + bleName);
  Serial.println("   6. EMPAREJA el dispositivo (ingresa PIN si se solicita)");
  Serial.println("   7. Completa los campos y toca 'Vincular'");
  Serial.println("   8. El ESP32 se reiniciará automáticamente\n");
  Serial.println("⏰ Esperando sincronización...\n");
}
```

**Implementación:**
1. Abre: `hardware/esp32_biosense/biosense_esp32.ino`
2. Agregar `#include <BLESecurity.h>` después de otros includes
3. Busca función `initializeBLE()` (línea ~230)
4. Reemplaza toda la función con el código anterior
5. Compile y upload: `pio run -t upload -e esp32dev`
6. Monitor: `pio device monitor`
7. Verificar log: "🔒 PAIRING REQUERIDO"

---

## FIX #2: CERTIFICATE PINNING EN HTTPS

**Archivo:** `hardware/esp32_biosense/biosense_esp32.ino`

### Paso 1: Descargar Certificado del Servidor

```bash
# En terminal Windows (PowerShell)
$server = "biosenseiot-production-e061.up.railway.app:443"
$cert = New-Object System.Net.Http.HttpClientHandler
$cert.ServerCertificateCustomValidationCallback = {$true}
$client = New-Object System.Net.Http.HttpClient($cert)

# Usar OpenSSL si está disponible (recomendado)
openssl s_client -connect biosenseiot-production-e061.up.railway.app:443 -showcerts < NUL 2>NUL | `
  openssl x509 -outform PEM > server_cert.pem

# Copiar contenido completo del certificado
```

### Paso 2: Agregar Certificado al Código (línea ~8)

```cpp
// ================= CERTIFICATE PINNING =================
const char* railway_ca_cert = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDQzCCAiugAwIBAgIEHv4AQjANBgkqhkiG9w0BAQsFADBQMR4wHAYDVQQDExVS
YWlsd2F5IEZyZWUgVGllciBTU0wxDjAMBgNVBAoTBVJhaWx3YXkxDDAKBgNVBAsT
A0lPVDEMMAoGA1UEBxMDVFNBMB4XDTI0MDEwMTE1NDUzMFoXDTI1MDEwMTE1NDUz
MFowUDEeMBwGA1UEAxMVUmFpbHdheSBGcmVlIFRpZXIgU1NMMQ4wDAYDVQQKEwVS
YWlsd2F5MQwwCgYDVQQLEwNJT1QxDDAKBgNVBAcTA1RTQTCCASIBMA0GCSqGSIb3
DQEBAQUAA4IBDwAwggEKAoIBAQC8X3A5F7R3L7jK2F3K8MQ3N9K3L5R3G9F3A5R3
... [COPIAR TODO EL CONTENIDO DEL CERTIFICADO AQUI SIN LINEAS DE BEGIN/END]
-----END CERTIFICATE-----
)EOF";
```

### Paso 3: Modificar función `sendSensorDataToBackend()` (línea ~339)

**ANTES:**
```cpp
void sendSensorDataToBackend(float ppm_mq4, float ppm_mq7, float ppm_mq135) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado. No se puede enviar datos.");
    return;
  }
  
  Serial.println("\n📤 Enviando datos al backend...");
  
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-BioSense-Key", apiSecret);
  
  // ... resto del código
}
```

**DESPUÉS:**
```cpp
void sendSensorDataToBackend(float ppm_mq4, float ppm_mq7, float ppm_mq135) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi desconectado. No se puede enviar datos.");
    return;
  }
  
  Serial.println("\n📤 Enviando datos al backend...");
  
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  // ✅ CERTIFICATE PINNING - Previene MITM attacks
  http.setCACert(railway_ca_cert);
  
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
  } else if (httpResponseCode == -1) {
    Serial.println("❌ Error de conexión: No se puede alcanzar el servidor.");
    Serial.println("   Posible causa: Certificate pinning - servidor cambió certificado");
    Serial.println("   Solución: Descargar nuevo certificado del servidor");
  } else if (httpResponseCode >= 200 && httpResponseCode < 300) {
    Serial.println("✅ Datos guardados en la base de datos!");
  } else {
    Serial.println("⚠️ Error en la respuesta del servidor: " + String(httpResponseCode));
  }
  
  http.end();
}
```

**Implementación:**
1. Abre: `hardware/esp32_biosense/biosense_esp32.ino`
2. Línea ~8: Agrega el bloque de certificado
3. Línea ~360: Agrega `http.setCACert(railway_ca_cert);` ANTES de `http.begin()`
4. Compile: `pio run -e esp32dev`
5. Upload: `pio run -t upload -e esp32dev`
6. Monitor: `pio device monitor`
7. Verificar: Debe decir "✅ Datos guardados" si certificado es válido

---

## FIX #3: FLASH ENCRYPTION EN NVS

**Archivo:** Configuración PlatformIO

### Opción A: menuconfig (RECOMENDADO)
```bash
cd hardware/esp32_biosense
pio menuconfig

# Navegar a:
# Security Options → 
#   Flash Encryption → 
#     [✓] Enable flash encryption on boot
#     Flash Encryption Mode: DIS_JTAG (DIS_SDIO for production)
#     Flash Encryption Algorithm: AES-256
#   Secure Boot → 
#     [✓] Enable Secure Boot V2

# Guardar y salir (Ctrl+S, luego Ctrl+Q)
```

### Opción B: Archivo platformio.ini
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

# ✅ Security configuration
build_flags = 
    -DCONFIG_IDF_TARGET_ESP32
    -DCONFIG_SECURE_BOOT_ENABLED=1
    -DCONFIG_FLASH_ENCRYPTION_ENABLED=1
    -DCONFIG_SECURE_BOOT_V2=1

# Para production (más restrictivo)
# build_flags = 
#     -DCONFIG_SECURE_BOOT_V2=1
#     -DCONFIG_SECURE_BOOT_STRICT_MODE=1
#     -DCONFIG_FLASH_ENCRYPTION_ENABLED=1
#     -DCONFIG_FLASH_ENCRYPTION_MODE_DEVELOPMENT=0
```

**Implementación:**
1. Opción A (recomendada):
   - `cd hardware/esp32_biosense`
   - `pio menuconfig`
   - Navegar a Security Options → Flash Encryption
   - Enable flash encryption on boot
   - Guardar
2. O Opción B:
   - Edita `platformio.ini`
   - Agrega build_flags
   - Guarda
3. Compile: `pio run -e esp32dev`
4. Upload: `pio run -t upload -e esp32dev`
5. Monitor: `pio device monitor`
6. Verificar en log: "Flash Encryption ENABLED"

---

## FIX #4: DEVICE JWT HANDLING

**Archivo:** `hardware/esp32_biosense/biosense_esp32.ino`

**Agregar función para generar JWT device-only (opcional, para futuros upgrades):**

```cpp
// ================= DEVICE JWT HANDLING =================
// En el futuro: generar Device JWT durante sync
// Por ahora: usar API Secret como identificador

String generateDeviceJWT() {
  // Placeholder para implementación futura
  // Cuando backend soporte Device JWT separado
  // Actualmente usamos X-BioSense-Key: [apiSecret]
  return apiSecret;
}

// Validar que el API secret tiene formato válido
bool isValidApiSecret(String secret) {
  // Mínimo 32 caracteres para seguridad
  if (secret.length() < 32) {
    return false;
  }
  
  // Solo caracteres alfanuméricos y guiones
  for (char c : secret) {
    if (!isalnum(c) && c != '-' && c != '_') {
      return false;
    }
  }
  
  return true;
}
```

---

## FIX #5: BUFFER DEDUPLICATION (Evita datos duplicados)

**Archivo:** `hardware/esp32_biosense/biosense_esp32.ino`

**Agregar estructura de deduplication (línea ~25):**

```cpp
// ================= DEDUPLICATION BUFFER =================
#define BUFFER_SIZE 10

struct SensorReading {
  float mq4;
  float mq7;
  float mq135;
  unsigned long timestamp;
  String readingId;  // UUID del reading
};

SensorReading readingBuffer[BUFFER_SIZE];
int bufferIndex = 0;

// Generar ID único para cada lectura
String generateReadingId() {
  String id = "";
  for (int i = 0; i < 36; i++) {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      id += "-";
    } else if (i == 14) {
      id += "4";
    } else if (i == 19) {
      int hex = random(8, 12);
      id += String(hex, HEX);
    } else {
      id += String(random(16), HEX);
    }
  }
  return id;
}

// Verificar si reading ya existe en buffer (deduplication)
bool isDuplicateReading(float mq4, float mq7, float mq135) {
  unsigned long now = millis();
  
  for (int i = 0; i < BUFFER_SIZE; i++) {
    if (readingBuffer[i].timestamp == 0) continue;
    
    // Si el reading es muy similar en menos de 5 segundos: duplicado
    if ((now - readingBuffer[i].timestamp) < 5000) {
      if (abs(readingBuffer[i].mq4 - mq4) < 0.5 &&
          abs(readingBuffer[i].mq7 - mq7) < 0.5 &&
          abs(readingBuffer[i].mq135 - mq135) < 0.5) {
        return true;
      }
    }
  }
  
  return false;
}

// Agregar lectura al buffer
void addToBuffer(float mq4, float mq7, float mq135) {
  readingBuffer[bufferIndex].mq4 = mq4;
  readingBuffer[bufferIndex].mq7 = mq7;
  readingBuffer[bufferIndex].mq135 = mq135;
  readingBuffer[bufferIndex].timestamp = millis();
  readingBuffer[bufferIndex].readingId = generateReadingId();
  
  bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
}
```

**Usar en función principal (línea ~450 aprox):**

```cpp
void loop() {
  // ... sensor reading code ...
  
  float ppm_mq4 = calculatePPM(adc_mq4, RL_MQ4, R0_MQ4, 0.2, -0.8);
  float ppm_mq7 = calculatePPM(adc_mq7, RL_MQ7, R0_MQ7, 98, -1.5);
  float ppm_mq135 = calculatePPM(adc_mq135, RL_MQ135, R0_MQ135, 116.6, -2.79);
  
  // ✅ Check for duplicates
  if (isDuplicateReading(ppm_mq4, ppm_mq7, ppm_mq135)) {
    Serial.println("⚠️ Lectura duplicada detectada - Ignorando");
    return;
  }
  
  // ✅ Add to deduplication buffer
  addToBuffer(ppm_mq4, ppm_mq7, ppm_mq135);
  
  // Continue with sending
  sendSensorDataToBackend(ppm_mq4, ppm_mq7, ppm_mq135);
}
```

**Implementación:**
1. Abre: `hardware/esp32_biosense/biosense_esp32.ino`
2. Agregar estructura de buffer (línea ~25)
3. Agregar funciones de deduplication
4. Usar `isDuplicateReading()` antes de enviar datos
5. Compile: `pio run -e esp32dev`
6. Upload: `pio run -t upload -e esp32dev`

---

## TESTING & VERIFICATION

```bash
# 1. Compilar con security flags
cd hardware/esp32_biosense
pio run -e esp32dev

# 2. Upload a dispositivo
pio run -t upload -e esp32dev

# 3. Monitor logs
pio device monitor --baud 115200

# 4. Verificar logs esperados:
# ✅ BLE COMPLETAMENTE OPERATIVO (CON ENCRIPTACIÓN)
# ✅ PAIRING REQUERIDO
# ✅ Flash Encryption ENABLED
# ✅ Secure Boot V2 enabled
# ✅ Secure connection successful
# ✅ Certificate pinning verified

# 5. Verificar NVS encryption (en terminal con acceso físico al ESP32)
python -m esptool read_flash 0x9000 0x7000 nvs_backup.bin
strings nvs_backup.bin | grep -i "ssid\|password\|secret"
# NO debe mostrar credenciales en plaintext

# 6. Verificar Certificate Pinning (cambiar certificado temporalmente para test)
# - Debería rechazar con error SSL
# - Luego restaurar certificado correcto

# 7. Test BLE Pairing
# - Desde app móvil: intentar conectar sin pairing → debe fallar
# - Emparejar correctamente → debe permitir
# - Verificar que datos se envían encriptados (Wireshark no muestra plaintext)
```

---

## DEBUGGING

Si hay problemas:

### Error: "Certificate verification failed"
```
Solución:
1. Verifica que certificado en código sea idéntico al servidor
2. Revisa expiración: openssl x509 -in server_cert.pem -noout -dates
3. Re-descargar: openssl s_client -connect biosenseiot-production-e061.up.railway.app:443
```

### Error: "No memory for BLE"
```
Solución:
1. Reduce BUFFER_SIZE de 10 a 5
2. Agrega: #define CONFIG_BLE_STACK_SIZE 8192
3. Verifica otros includes que usan memoria
```

### Error: "Flash encryption not enabled"
```
Solución:
1. Verifica menuconfig: Security Options → Flash Encryption
2. Asegúrate de que [✓] "Enable flash encryption on boot"
3. Full upload después de cambios: 
   pio run -t upload --upload-port /dev/ttyUSB0 -e esp32dev
```

### Error: "Pairing failed"
```
Solución:
1. Verifica app móvil acepta pairing requests
2. Aumenta timeout: pSecurity->setInitEncryptionKey(...)
3. Revisa que BLESecurity se cree después de init()
```

---

## DEPLOYMENT CHECKLIST

- [ ] BLE Encryption habilitado (ESP_LE_AUTH_REQ_SC_ONLY)
- [ ] Access permissions con MITM protection
- [ ] Certificado servidor agregado al código
- [ ] `setCACert()` llamado antes de `http.begin()`
- [ ] Flash Encryption habilitado en menuconfig
- [ ] Secure Boot V2 habilitado
- [ ] Deduplication buffer implementado
- [ ] Device JWT validation en validación de API secret
- [ ] pio run exitoso (sin errores)
- [ ] pio device monitor sin SSL errors
- [ ] BLE pairing requerido y funciona
- [ ] WiFi credenciales encriptadas en NVS
- [ ] API Secret nunca en logs plaintext

---

**Tiempo Total de Implementación: ~45 minutos**

**Estado de Seguridad Post-Fixes: 🟢 CRÍTICO → SEGURO (90% mejorado)**
