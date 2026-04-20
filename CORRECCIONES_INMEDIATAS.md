# 🚨 CORRECCIONES INMEDIATAS - 48h Máximo

## 1️⃣ TIMING-SAFE COMPARISON (Backend) ⏱️ 15 min

### Archivo: `backend/src/main/java/com/biosense/iot/sensor/application/usecase/IngestSensorReadingUseCaseImpl.java`

**BUSCAR (Línea ~55):**
```java
if (!storedSecret.equals(apiKey)) {
    return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid X-BioSense-Key"));
}
```

**REEMPLAZAR POR:**
```java
// Timing-safe comparison to prevent timing attacks
byte[] storedBytes = storedSecret.getBytes(StandardCharsets.UTF_8);
byte[] providedBytes = apiKey.getBytes(StandardCharsets.UTF_8);

if (!MessageDigest.isEqual(storedBytes, providedBytes)) {
    return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid X-BioSense-Key"));
}
```

**VERIFICAR IMPORT:**
```java
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
```

---

## 2️⃣ JWT CLAIMS SECURITY (Backend) ⏱️ 20 min

### Archivo: `backend/src/main/java/com/biosense/iot/auth/infrastructure/security/jwt/JwtAdapter.java`

**REEMPLAZAR MÉTODO `generateAccessToken` (Línea 35-42):**

```java
public String generateAccessToken(String email) {
    return Jwts.builder()
            .header()
                .add("typ", "JWT")
                .add("kid", "key-v1")  // Key rotation support
            .and()
            .subject(email)
            .id(UUID.randomUUID().toString())  // JWT ID for revocation
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .claim("type", "access")  // Token type claim
            .claim("iss", "biosense-iot-backend")  // Issuer
            .claim("aud", "biosense-iot-api")  // Audience
            .signWith(getSignInKey(), io.jsonwebtoken.SignatureAlgorithm.HS256)
            .compact();
}
```

**REEMPLAZAR MÉTODO `generateRefreshToken` (Línea 47-54):**

```java
public String generateRefreshToken(String email) {
    return Jwts.builder()
            .header()
                .add("typ", "JWT")
                .add("kid", "key-v1")
            .and()
            .subject(email)
            .id(UUID.randomUUID().toString())
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
            .claim("type", "refresh")  // Different type
            .claim("iss", "biosense-iot-backend")
            .claim("aud", "biosense-iot-api")
            .signWith(getSignInKey(), io.jsonwebtoken.SignatureAlgorithm.HS256)
            .compact();
}
```

**AGREGAR IMPORTS:**
```java
import java.util.UUID;
import io.jsonwebtoken.SignatureAlgorithm;
```

**AGREGAR VALIDACIÓN DE TIPO (después de `isTokenValid`):**

```java
public boolean isAccessToken(String token) {
    try {
        final Claims claims = extractAllClaims(token);
        return "access".equals(claims.get("type"));
    } catch (Exception e) {
        return false;
    }
}

public boolean isRefreshToken(String token) {
    try {
        final Claims claims = extractAllClaims(token);
        return "refresh".equals(claims.get("type"));
    } catch (Exception e) {
        return false;
    }
}
```

---

## 3️⃣ CERTIFICATE PINNING (ESP32) ⏱️ 10 min

### Archivo: `hardware/esp32_biosense/biosense_esp32.ino`

**1. Descargar certificado del servidor:**
```bash
# Ejecutar en terminal
openssl s_client -connect biosenseiot-production-e061.up.railway.app:443 \
  -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -outform PEM > server_cert.pem
```

**2. En ESP32, reemplazar función `sendSensorDataToBackend` (Línea 339):**

**AGREGAR CERTIFICADO AL INICIO (línea ~8, después de includes):**
```cpp
const char* railway_ca_cert = R"EOF(
-----BEGIN CERTIFICATE-----
[COPIAR CONTENIDO DE server_cert.pem AQUI - TODO EL CERTIFICADO]
-----END CERTIFICATE-----
)EOF";
```

**REEMPLAZAR LÍNEA 358:**
```cpp
// ❌ ANTES:
http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");

// ✅ DESPUÉS:
http.setCACert(railway_ca_cert);  // Agregar ESTA LÍNEA
http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
```

**VERIFICAR en línea 378-379:**
```cpp
} else if (httpResponseCode == -1) {
    Serial.println("❌ Error de conexión: No se puede alcanzar el servidor.");
    // Ahora esto también puede incluir SSL verification failure
```

---

## 4️⃣ NVS ENCRYPTION (ESP32) ⏱️ 5 min

### Archivo: Configuración PlatformIO

**OPCIÓN 1 - Usar menuconfig (RECOMENDADO):**
```bash
cd hardware/esp32_biosense
pio menuconfig

# Navegar a:
# Security Options → 
#   Flash Encryption → 
#     [✓] Enable flash encryption on boot
#     Flash Encryption Mode: DIS_JTAG (DIS_SDIO for production)
#     Flash Encryption Algorithm: AES-256
```

**OPCIÓN 2 - Archivo platformio.ini:**
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

# Habilitar Flash Encryption
monitor_speed = 115200
build_flags = 
    -DCONFIG_IDF_TARGET_ESP32
    -DCONFIG_SECURE_BOOT_ENABLED=0
    -DCONFIG_FLASH_ENCRYPTION_ENABLED=1
```

---

## 5️⃣ BLE ENCRYPTION (ESP32) ⏱️ 30 min

### Archivo: `hardware/esp32_biosense/biosense_esp32.ino`

**AGREGAR DESPUÉS DE `#include <BLE2902.h>` (línea 6):**
```cpp
#include <BLESecurity.h>
```

**REEMPLAZAR FUNCIÓN `initializeBLE` (línea 230):**

**BUSCAR:**
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
```

**REEMPLAZAR SECCIÓN DE INICIALIZACIÓN SOLO HASTA setMTU POR:**
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
```

**DESPUÉS DE CREAR CARACTERÍSTICA (línea 257-263), AGREGAR:**
```cpp
  // ✅ Requiere encriptación para leer/escribir
  pCharacteristic->setAccessPermissions(
    ESP_GATT_PERM_READ_ENC_AUTH_MITM | 
    ESP_GATT_PERM_WRITE_ENC_AUTH_MITM);
```

---

## 6️⃣ VALIDACIÓN COMPLETA - POST DEPLOYMENT ⏱️ 5 min

### Script de verificación:

```bash
#!/bin/bash
echo "🔍 Verificando correcciones de seguridad..."

# 1. JWT Claims
echo -n "✓ JWT Claims: "
grep -q "\"type\".*\"access\"" backend/src/main/java/com/biosense/iot/auth/infrastructure/security/jwt/JwtAdapter.java && echo "OK" || echo "FALTA"

# 2. Timing-Safe Comparison
echo -n "✓ MessageDigest.isEqual: "
grep -q "MessageDigest.isEqual" backend/src/main/java/com/biosense/iot/sensor/application/usecase/IngestSensorReadingUseCaseImpl.java && echo "OK" || echo "FALTA"

# 3. Certificate Pinning
echo -n "✓ setCACert: "
grep -q "setCACert" hardware/esp32_biosense/biosense_esp32.ino && echo "OK" || echo "FALTA"

# 4. BLE Security
echo -n "✓ BLESecurity: "
grep -q "BLESecurity" hardware/esp32_biosense/biosense_esp32.ino && echo "OK" || echo "FALTA"

echo "✅ Verificación completa"
```

---

## ⚠️ TESTING REQUERIDO

Después de cada corrección:

### Backend:
```bash
cd backend
mvn clean test
mvn spring-boot:run  # Verificar que arranca sin errores
```

### ESP32:
```bash
cd hardware/esp32_biosense
pio run -t upload -e esp32dev
pio device monitor  # Verificar conexión TLS exitosa
```

---

## 📋 CHECKLIST PRE-PRODUCCIÓN

- [ ] Timing-safe comparison implementado
- [ ] JWT claims (type, jti, aud, iss) agregados
- [ ] Certificate pinning en ESP32
- [ ] BLE encryption configurado
- [ ] Flash encryption habilitado
- [ ] Tests locales pasan
- [ ] Railway deployment exitoso
- [ ] ESP32 se conecta sin SSL errors
- [ ] Verificar logs para "SSL verification" errors: NINGUNO

---

**Tiempo total de implementación: ~90 minutos**
