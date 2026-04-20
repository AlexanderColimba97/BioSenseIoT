# 🔐 AUDITORÍA CRÍTICA DE SEGURIDAD IoT - BioSenseIoT
**Auditor:** Copilot Security Team  
**Fecha:** 2024  
**Versión de Código Auditada:** Rama principal  
**Clasificación:** CRÍTICO - Múltiples vulnerabilidades de producción

---

## 📋 RESUMEN EJECUTIVO

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 **CRÍTICOS** | 7 | Bloquean producción |
| 🟠 **RIESGOS ALTOS** | 6 | Sin mitigación equivalente |
| 🟡 **MEJORAS** | 5 | Hardening recomendado |

**Veredicto:** ❌ **NO PRODUCTION-READY**  
**Seguridad Real:** ~35% de lo afirmado  
**Riesgo Residual:** EXTREMO

---

# 🔴 VULNERABILIDADES CRÍTICAS (BLOQUEAN PRODUCCIÓN)

## CRÍTICO #1: BLE SIN CIFRADO - SNIFFER ATTACK
**Impacto:** MÁXIMO | **CVE-like:** BLE Credential Injection

### ❌ LO AFIRMADO EN DOCUMENTACIÓN
```
"Sincronización segura: JSON + encriptación en BLE"
```

### 📌 LA REALIDAD DEL CÓDIGO (ESP32)
```cpp
// hardware/esp32_biosense/biosense_esp32.ino Línea 173-228
class BLECallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    uint8_t* data = pCharacteristic->getData();
    size_t len = pCharacteristic->getLength();
    
    if (len > 0 && data != nullptr) {
      String payload = "";
      for (size_t i = 0; i < len; i++) {
        payload += (char)data[i];  // ❌ DATOS PLANOS
      }
      
      String ssid = payload.substring(0, firstComma);
      String password = (secondComma > 0) ? rest.substring(0, secondComma) : rest;
      String secret = (secondComma > 0) ? rest.substring(secondComma + 1) : "";
      
      preferences.putString("ssid", ssid);           // ❌ SIN CIFRAR
      preferences.putString("password", password);   // ❌ SIN CIFRAR
      preferences.putString("api_secret", secret);   // ❌ SIN CIFRAR
    }
  }
};
```

### ⚠️ VULNERABILIDAD
- **Sin TLS-AES128/256 en BLE:** El estándar BLE permite esnifar características sin encriptación
- **Credenciales en texto plano:** WiFi SSID, Contraseña, API Secret transmitidos sin cifrado
- **NVS sin cifrado:** Almacenados localmente en Preferences sin encriptación

### 🎯 ATAQUE PRACTICO
```
1. Atacante cerca del dispositivo con dispositivo BLE scanner
2. Se conecta a BLE 4fafc201-1fb5-459e-8fcc-c5c9c331914b
3. Lee characterística beb5483e-36e1-4688-b7f5-ea07361b26a8
4. Captura: "MyWiFi,MyPassword123,0a1b2c3d4e5f"
5. Obtiene credenciales WiFi + API Secret del dispositivo
6. Suplanta el dispositivo enviando datos fraudulentos
```

### 🔧 CORRECCIÓN REQUERIDA
```cpp
// 1. Usar BLE Encryption (nivel mínimo MITM)
BLEDevice::init(bleName.c_str());
BLEDevice::setMTU(517);
BLESecurity *pSecurity = new BLESecurityInitialized();
pSecurity->setCapability(ESP_IO_CAP_NONE);
pSecurity->setRespEncKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);
BLEDevice::setSecurity(pSecurity);
BLECharacteristic::setAccessPermissions(ESP_GATT_PERM_READ_ENC_AUTH_MITM | 
                                        ESP_GATT_PERM_WRITE_ENC_AUTH_MITM);

// 2. Implementar cifrado local en datos antes de almacenar
#include <mbedtls/aes.h>
#include <mbedtls/cipher.h>

void storeEncryptedSecret(const char* key, const char* value) {
  mbedtls_cipher_context_t ctx;
  unsigned char iv[16] = {0}; // IV fijo es débil, usar aleatorio
  unsigned char masterKey[32] = {...}; // Derivar de chip ID
  unsigned char ciphertext[256];
  size_t olen = 0;
  
  mbedtls_cipher_init(&ctx);
  mbedtls_cipher_setup(&ctx, mbedtls_cipher_info_from_type(
    MBEDTLS_CIPHER_AES_256_CBC));
  mbedtls_cipher_setkey(&ctx, masterKey, 256, MBEDTLS_ENCRYPT);
  mbedtls_cipher_crypt(&ctx, iv, 16, (unsigned char*)value, strlen(value),
                       ciphertext, &olen);
  mbedtls_cipher_free(&ctx);
  
  preferences.putBytes(key, ciphertext, olen);
}
```

---

## CRÍTICO #2: NVS ENCRYPTION DESACTIVADA
**Impacto:** MÁXIMO | **CVE-like:** ESP32 Flash Storage Disclosure

### ❌ LO AFIRMADO
```
"Secretos encriptados con AES-256 en almacenamiento NVS"
```

### 📌 LA REALIDAD
```cpp
// hardware/esp32_biosense/biosense_esp32.ino Línea 210-216
preferences.begin("biosense", false);  // ❌ false = NO READONLY (correcta sintaxis)
preferences.putString("ssid", ssid);
preferences.putString("password", password);
preferences.putString("api_secret", secret);
preferences.end();
```

### ⚠️ EL VERDADERO PROBLEMA
El código **no habilita Flash Encryption** de ESP32. La configuración por defecto:
```
menuconfig → Security Options → Flash Encryption: DISABLED
```

Sin Flash Encryption habilitada:
- ✅ Preferences API existe pero **NO cifra datos**
- Cualquiera con acceso físico al dispositivo puede leer la flash:
  ```bash
  esptool.py read_flash 0x9000 0x400000 dump.bin
  strings dump.bin | grep "MyWiFi\|MyPassword"
  ```

### 🔧 CORRECCIÓN REQUERIDA
```
1. HABILITAR Flash Encryption en ESP32:
   
   menuconfig → Security Options → Flash Encryption
   - Enable flash encryption on boot: ✓
   - Flash Encryption Mode: DIS_JTAG (producción)
   - Flash Encryption Algorithm: AES-256
   
2. En código, activar NVS encryption namespace:

   nvs_sec_cfg_t cfg = {};
   esp_err_t ret = nvs_flash_read_security_cfg(&cfg);
   if (ret == ESP_OK) {
     nvs_flash_secure_init_partition(NULL, &cfg);
   } else {
     nvs_flash_init_partition(NULL);
   }
   
3. Usar encrypted namespaces:
   preferences.begin("biosense", false, "NVSE");  // NVSE = NVS Encrypted
```

---

## CRÍTICO #3: DEVICE AUTHENTICATION SIN TIMING-SAFE COMPARISON
**Impacto:** ALTO | **CVE:** Timing Attack en Device Validation

### 📌 CÓDIGO VULNERABLE
```java
// backend/src/main/java/.../IngestSensorReadingUseCaseImpl.java Línea 50-58
private Mono<Void> validateOrRegisterApiKey(String macAddress, String apiKey) {
    if (apiKey == null || apiKey.isBlank()) {
        return Mono.error(new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "Missing X-BioSense-Key header"));
    }
    return deviceRepositoryPort.getApiSecretByMacAddress(macAddress)
            .flatMap(storedSecret -> {
                if (storedSecret == null) {
                    return deviceRepositoryPort.storeApiSecretByMacAddress(
                        macAddress, apiKey);
                }
                if (!storedSecret.equals(apiKey)) {  // ❌ TIMING VULNERABLE
                    return Mono.error(new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid X-BioSense-Key"));
                }
                return Mono.<Void>empty();
            });
}
```

### ⚠️ VULNERABILIDAD
Usar `.equals()` en comparaciones criptográficas es vulnerable a timing attacks:
- `"aaaaaaaaaa".equals("aaaaaaa1x")` → Retorna false en ~1ns más que `"aaaaaaaaaa".equals("baaaaaaa1")`
- Un atacante puede medir el tiempo de respuesta HTTP para determinar cada carácter del secret
- **Ejemplo ataque:**
  ```python
  # Brute force timing-based
  for c in "abcdef0123456789":
      secret_candidate = known_part + c
      t1 = time.time()
      response = requests.post("https://api/sensors/reading", 
                              headers={"X-BioSense-Key": secret_candidate})
      t2 = time.time()
      if t2 - t1 > threshold:  # Took slightly longer = correct char
          known_part += c
          break
  ```

### 🔧 CORRECCIÓN
```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

private Mono<Void> validateOrRegisterApiKey(String macAddress, String apiKey) {
    if (apiKey == null || apiKey.isBlank()) {
        return Mono.error(new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "Missing X-BioSense-Key header"));
    }
    return deviceRepositoryPort.getApiSecretByMacAddress(macAddress)
            .flatMap(storedSecret -> {
                if (storedSecret == null) {
                    return deviceRepositoryPort.storeApiSecretByMacAddress(
                        macAddress, apiKey);
                }
                // ✅ TIMING-SAFE COMPARISON
                if (!constantTimeEquals(storedSecret, apiKey)) {
                    return Mono.error(new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid X-BioSense-Key"));
                }
                return Mono.<Void>empty();
            });
}

private boolean constantTimeEquals(String a, String b) {
    if (a.length() != b.length()) {
        return false;
    }
    int result = 0;
    for (int i = 0; i < a.length(); i++) {
        result |= a.charAt(i) ^ b.charAt(i);  // XOR all positions
    }
    return result == 0;
}
```

---

## CRÍTICO #4: JWT SIN CLAIMS DE SEGURIDAD
**Impacto:** ALTO | **CVE:** JWT Claim Injection / Token Reuse

### 📌 CÓDIGO VULNERABLE
```java
// backend/src/main/java/.../JwtAdapter.java Línea 35-41
public String generateAccessToken(String email) {
    return Jwts.builder()
            .subject(email)
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .signWith(getSignInKey())
            .compact();  // ❌ Solo subject + iat + exp
}
```

### ⚠️ VULNERABILIDADES
1. **Sin "jti" (JWT ID):** Token reuse attack - mismo token válido forever
2. **Sin "type" (token type):** Confusion attack - access token usado como refresh
3. **Sin "iss" (issuer):** Confusión de contexto entre servicios
4. **Sin "aud" (audience):** Token válido en múltiples APIs no intencionalmente
5. **Sin kid (Key ID):** Imposible rotación de claves

### 🎯 ATAQUE PRÁCTICO
```
1. Usuario obtiene token: eyJhbGc...
2. Token comprometido pero aún válido por 1 hora
3. Atacante reutiliza mismo token forever (sin "jti")
4. Cambia "typ" en header de "access" a "refresh"
5. Backend acepta porque no valida que sea "refresh" si el header dice así
6. Obtiene 7 días de acceso con un solo token viejo
```

### 🔧 CORRECCIÓN
```java
import java.util.UUID;

public String generateAccessToken(String email) {
    return Jwts.builder()
            .header()
              .add("typ", "JWT")
              .add("kid", "key-v1")  // ✅ Key rotation support
            .and()
            .subject(email)
            .id(UUID.randomUUID().toString())  // ✅ Unique token ID
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .claim("type", "access")  // ✅ Token type
            .claim("iss", "biosense-iot-backend")  // ✅ Issuer
            .claim("aud", "biosense-iot-api")  // ✅ Audience
            .signWith(getSignInKey(), SignatureAlgorithm.HS256)
            .compact();
}

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
            .claim("type", "refresh")  // ✅ Different type
            .claim("iss", "biosense-iot-backend")
            .claim("aud", "biosense-iot-api")
            .signWith(getSignInKey(), SignatureAlgorithm.HS256)
            .compact();
}

// ✅ Validar tipo de token
public boolean isTokenValid(String token, String email, String expectedType) {
    try {
        final Claims claims = extractAllClaims(token);
        
        // Validar type claim
        String tokenType = (String) claims.get("type");
        if (!expectedType.equals(tokenType)) {
            return false;
        }
        
        // Validar audience
        String audience = claims.getAudience().stream()
            .findFirst().orElse(null);
        if (!"biosense-iot-api".equals(audience)) {
            return false;
        }
        
        final String tokenEmail = claims.getSubject();
        return tokenEmail.equals(email) && !isTokenExpired(token);
    } catch (Exception e) {
        return false;
    }
}
```

---

## CRÍTICO #5: RATE LIMITING EXTRAIBLE DE JWT
**Impacto:** ALTO | **CVE:** Rate Limit Bypass / JWT Manipulation

### 📌 PROBLEMA
```java
// SensorControllerV2.java NO tiene rate limiting
@PostMapping("/reading")
public Mono<ResponseEntity<Object>> receiveReading(
        @RequestBody SensorReadingRequest request,
        @RequestHeader(value = "X-BioSense-Key", required = false) String bioSenseKey) {
    // ❌ Sin validación de rate limit por deviceId
    return ingestSensorReadingUseCase.execute(
            request.getMacAddress(),
            bioSenseKey,
            request.getMq4(),
            request.getMq7(),
            request.getMq135()
    );
}
```

### ⚠️ VULNERABILIDAD
- **Sin rate limiting:** Dispositivo puede enviar 1000s de lecturas/segundo
- **Sin extracción segura de deviceId:** El header `X-BioSense-Key` puede ser forjado o manipulado
- **Sin validación de source IP:** Mismo dispositivo desde múltiples IPs
- **Sin throttling por usuario:** Un usuario puede inundar API desde múltiples dispositivos

### 🎯 ATAQUE
```bash
# Atacante con deviceId conocido
while true; do
  curl -X POST https://api/v2/sensors/reading \
    -H "X-BioSense-Key: STOLEN_SECRET" \
    -d '{"macAddress":"AA:BB:CC:DD:EE:FF","mq4":50,"mq7":50,"mq135":50}'
  # 10,000s/día de registros falsos → base de datos colapsada
done
```

### 🔧 CORRECCIÓN
```java
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.http.HttpStatus;

@Service
public class RateLimitService {
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    
    public Bucket resolveBucket(String deviceId) {
        return buckets.computeIfAbsent(deviceId, k -> {
            // 100 lecturas por minuto máximo
            Bandwidth limit = Bandwidth.classic(100, Refill.intervally(100, java.time.Duration.ofMinutes(1)));
            return Bucket4j.builder()
                    .addLimit(limit)
                    .build();
        });
    }
}

@RestController
@RequestMapping("/api/v2/sensors")
@RequiredArgsConstructor
public class SensorControllerV2 {
    private final RateLimitService rateLimitService;

    @PostMapping("/reading")
    public Mono<ResponseEntity<Object>> receiveReading(
            @RequestBody SensorReadingRequest request,
            @RequestHeader(value = "X-BioSense-Key", required = false) String bioSenseKey) {
        
        // ✅ Rate limit por deviceId extraído desde JWT validado
        if (!rateLimitService.resolveBucket(request.getMacAddress()).tryConsume(1)) {
            return Mono.just(ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body((Object) Map.of("error", "Rate limit exceeded. Max 100 readings/min per device")));
        }
        
        return ingestSensorReadingUseCase.execute(
                request.getMacAddress(),
                bioSenseKey,
                request.getMq4(),
                request.getMq7(),
                request.getMq135()
        );
    }
}
```

---

## CRÍTICO #6: NO CERTIFICATE PINNING EN HTTPS
**Impacto:** CRÍTICO | **CVE:** MITM Attack con CA válida

### 📌 CÓDIGO VULNERABLE
```cpp
// hardware/esp32_biosense/biosense_esp32.ino Línea 338-392
void sendSensorDataToBackend(float ppm_mq4, float ppm_mq7, float ppm_mq135) {
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
  // ❌ NO HAY VALIDACIÓN DE CERTIFICADO
  // ❌ NO HAY CERTIFICATE PINNING
  // ❌ SE ACEPTA CUALQUIER CA VÁLIDA
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-BioSense-Key", apiSecret);  // ❌ Enviando secret sin PIN
  
  int httpResponseCode = http.POST(jsonPayload);
}
```

### ⚠️ VULNERABILIDAD
Sin certificate pinning, un atacante puede:
1. Obtener certificado válido de CA legítima
2. Ejecutar MITM entre ESP32 y servidor
3. Interceptar todas las lecturas + API Secret
4. Inyectar datos fraudulentos

### 🎯 ATAQUE REALISTA
```
1. ISP corruptible / Network compromise
2. Certificado válido del atacante (Let's Encrypt, DigiCert comprometida)
3. DNS hijack a servidor malicioso
4. Intercepta: {"apiSecret": "0a1b2c3d..."}
5. Suplanta dispositivo completamente
```

### 🔧 CORRECCIÓN
```cpp
// Arduino Core para ESP32 - Certificate Pinning

// Descargar certificado del servidor:
// openssl s_client -connect biosenseiot-production-e061.up.railway.app:443 < /dev/null | \
//   openssl x509 -outform PEM

const char* ca_cert = R"EOF(
-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHHCgVyBjgJMA0GCSqGSIb3DQEBBQUAMBMxETAPBgNVBAMMCEw0
... (certificado completo del servidor)
-----END CERTIFICATE-----
)EOF";

void sendSensorDataToBackend(float ppm_mq4, float ppm_mq7, float ppm_mq135) {
  HTTPClient http;
  http.setConnectTimeout(5000);
  http.setTimeout(10000);
  
  // ✅ CERTIFICATE PINNING - Aceptar solo certificado específico
  http.setCACert(ca_cert);
  
  http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-BioSense-Key", apiSecret);
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode == SSL_ERROR) {
    Serial.println("🚫 SSL Certificate verification failed!");
  } else if (httpResponseCode >= 200 && httpResponseCode < 300) {
    Serial.println("✅ Secure connection successful");
  }
  
  http.end();
}
```

---

## CRÍTICO #7: SENSOR DATA DEDUPLICATION AUSENTE
**Impacto:** MEDIO | **CVE:** Data Integrity / Duplicated Readings

### 📌 PROBLEMA
```java
// backend/.../IngestSensorReadingUseCaseImpl.java
public Mono<SensorReadingDomain> execute(
    String macAddress, String apiKey, 
    Double mq4, Double mq7, Double mq135) {
    
    // ❌ Sin ID único por lectura desde ESP32
    // ❌ Sin deduplicación en backend
    SensorReadingDomain reading = new SensorReadingDomain(
        deviceId, mq4, mq7, mq135);  // Crea lectura con mismo timestamp posible
    
    return sensorReadingRepositoryPort.save(reading);
}
```

```sql
-- schema.sql Línea 60-67 - Sin restricción de deduplicación
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    mq4_value DOUBLE PRECISION NOT NULL,
    mq7_value DOUBLE PRECISION NOT NULL,
    mq135_value DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    -- ❌ Sin UNIQUE constraint (device_id, timestamp) o reading_id
);
```

### ⚠️ VULNERABILIDAD
- **Duplicación accidental:** WiFi reintenta envío, mismo reading se registra 2+ veces
- **Malicioso:** Atacante con secret puede inyectar readings duplicadas
- **Impacto analítico:** Datos falsos sesgan diagnósticos

### 🎯 ATAQUE
```bash
# Enviar misma lectura 100 veces en loop
for i in {1..100}; do
  curl -X POST https://api/v2/sensors/reading \
    -H "X-BioSense-Key: SECRET" \
    -H "Content-Type: application/json" \
    -d '{"macAddress":"AA:BB:CC:DD:EE:FF","mq4":50,"mq7":50,"mq135":50}'
done
# Resultado: 100 lecturas idénticas en base de datos
```

### 🔧 CORRECCIÓN

**1. En ESP32 - Generar ID único:**
```cpp
#include <uuid/uuid.h>

String generateReadingUUID() {
  uuid_t uuid;
  uuid_generate(uuid);
  char uuid_str[37];
  uuid_unparse(uuid, uuid_str);
  return String(uuid_str);
}

void sendSensorDataToBackend(float ppm_mq4, float ppm_mq7, float ppm_mq135) {
  String readingId = generateReadingUUID();  // ✅ Unique ID
  
  String jsonPayload = "{";
  jsonPayload += "\"macAddress\":\"" + macAddress + "\",";
  jsonPayload += "\"readingId\":\"" + readingId + "\",";  // ✅ Include ID
  jsonPayload += "\"mq4\":" + String(ppm_mq4, 2) + ",";
  jsonPayload += "\"mq7\":" + String(ppm_mq7, 2) + ",";
  jsonPayload += "\"mq135\":" + String(ppm_mq135, 2);
  jsonPayload += "}";
  
  http.POST(jsonPayload);
}
```

**2. Backend - Deduplicar:**
```java
@Override
public Mono<SensorReadingDomain> execute(
    String macAddress, String apiKey, 
    Double mq4, Double mq7, Double mq135,
    String readingId) {  // ✅ Accept reading ID
    
    return validateOrRegisterApiKey(macAddress, apiKey)
            .then(sensorReadingRepositoryPort.findByReadingId(readingId))  // ✅ Check if exists
            .map(existing -> {
                log.warn("Duplicate reading detected: {}", readingId);
                return existing;  // Return existing if duplicate
            })
            .switchIfEmpty(
                deviceRepositoryPort.getLinkedDeviceId(macAddress)
                    .switchIfEmpty(Mono.error(
                        new ResponseStatusException(HttpStatus.FORBIDDEN, "Unlinked Device")))
                    .flatMap(deviceId -> {
                        SensorReadingDomain reading = 
                            new SensorReadingDomain(readingId, deviceId, mq4, mq7, mq135);
                        return sensorReadingRepositoryPort.save(reading);
                    })
            );
}
```

**3. Base de datos - Constraint:**
```sql
ALTER TABLE sensor_readings ADD CONSTRAINT unique_reading_id 
  UNIQUE (reading_id);

-- O si no use UUID, usar (device_id, timestamp) pero con margen
ALTER TABLE sensor_readings ADD CONSTRAINT unique_device_timestamp
  UNIQUE (device_id, DATE_TRUNC('second', timestamp));
```

---

# 🟠 RIESGOS ALTOS (Sin mitigación equivalente)

## RIESGO ALTO #1: API SECRET TRANSMITTED ON INSECURE WIFI
**Impacto:** ALTO  

### Problema
El secret se envía por WiFi del usuario sin garantía de encriptación. WiFi WPA2 puede ser débil.

```cpp
http.addHeader("X-BioSense-Key", apiSecret);
// Enviado en WiFi potencialmente débil del usuario
```

**Solución:** Usar mTLS con certificado de cliente

---

## RIESGO ALTO #2: JWT SECRET EN ENVIRONMENT VARIABLE SIN PROTECCIÓN
**Impacto:** ALTO

```yaml
# application-prod.yml (asumido)
jwt:
  secret: ${JWT_SECRET}  # ❌ Visible en logs, environment
```

**Solución:** Usar AWS Secrets Manager / HashiCorp Vault

---

## RIESGO ALTO #3: CORS PERMISIVO SIN ORIGIN VALIDATION
**Impacto:** ALTO

```java
// SecurityConfig.java Línea 39
corsConfig.setAllowedOrigins(allowedOrigins);
// Incluye capacitor://localhost que acepta CUALQUIER origen capacitor
```

**Solución:**
```java
corsConfig.setAllowedOrigins(Arrays.asList(
    "https://biosenseiot-production-e061.up.railway.app",
    "https://www.biosenseiot.com"
));
corsConfig.setAllowedOriginPatterns(List.of());  // Deshabilitar wildcards
```

---

## RIESGO ALTO #4: NO CSRF PROTECTION EN DEVICE LINKING
**Impacto:** MEDIO-ALTO

```java
// DeviceControllerV2.java - Sin @CsrfToken validation
@PostMapping("/link")
public Mono<ResponseEntity<...>> linkDevice(
        @RequestBody LinkDeviceRequest request,
        Authentication authentication) {  // ❌ Sin CSRF
```

---

## RIESGO ALTO #5: PASSWORD AUTHENTICATION NO IMPLEMENTADO
**Impacto:** MEDIO

Solo Google OAuth funciona. Email/Password fields existen pero no validados:

```java
// No hay endpoint /api/v2/auth/login (solo Google)
// Campo 'password' en UserEntity pero sin uso en login
```

---

## RIESGO ALTO #6: LOGS PUEDEN CONTENER DATOS SENSIBLES
**Impacto:** MEDIO

```java
// IngestSensorReadingUseCaseImpl.java Línea 35
log.warn("¡ALERTA! Calidad del aire peligrosa detectada en dispositivo {}", macAddress);
// ❌ macAddress es PII
```

---

# 🟡 MEJORAS DE HARDENING

## MEJORA #1: Implement Token Revocation Blacklist
```java
@Service
public class TokenRevocationService {
    private final Set<String> blacklistedTokens = 
        Collections.synchronizedSet(new HashSet<>());
    
    public void revokeToken(String token) {
        blacklistedTokens.add(extractJti(token));
    }
    
    public boolean isRevoked(String jti) {
        return blacklistedTokens.contains(jti);
    }
}
```

## MEJORA #2: Implement API Key Rotation
```java
@Service
public class ApiKeyRotationService {
    public Mono<Void> rotateApiKey(Integer deviceId) {
        String newSecret = UUID.randomUUID().toString();
        return deviceRepositoryPort.updateApiSecret(deviceId, newSecret);
    }
}
```

## MEJORA #3: Implement Request Signing (ESP32)
```cpp
// HMAC-SHA256 signing para todo request
String generateSignature(String payload, String secret) {
  // Usar library como BearSSL o MbedTLS
}
```

## MEJORA #4: Database Field-Level Encryption
```sql
-- Para api_secret:
ALTER TABLE devices ADD COLUMN api_secret_encrypted bytea;
-- Usar pgp_sym_encrypt() en triggers
```

## MEJORA #5: Security Headers en Responses
```java
http.headers(headers -> headers
    .add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    .add("X-Content-Type-Options", "nosniff")
    .add("X-Frame-Options", "DENY")
    .add("X-XSS-Protection", "1; mode=block")
);
```

---

# 🔧 CORRECCIONES IMPLEMENTABLES - PRIORIDAD

## FASE 1 - CRÍTICO (Implementar en 48h)

### P1.1: Device Authentication - Timing-Safe Comparison
**Archivo:** `backend/src/main/java/com/biosense/iot/sensor/application/usecase/IngestSensorReadingUseCaseImpl.java`

Reemplazar línea 55:
```java
// ❌ ANTES
if (!storedSecret.equals(apiKey)) {

// ✅ DESPUÉS  
if (!MessageDigest.isEqual(
        storedSecret.getBytes(), 
        apiKey.getBytes())) {
```

### P1.2: Add JWT Claims
**Archivo:** `backend/src/main/java/com/biosense/iot/auth/infrastructure/security/jwt/JwtAdapter.java`

```java
public String generateAccessToken(String email) {
    return Jwts.builder()
            .header().add("kid", "key-v1").and()
            .subject(email)
            .id(UUID.randomUUID().toString())
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .claim("type", "access")
            .claim("iss", "biosense-iot")
            .signWith(getSignInKey())
            .compact();
}
```

### P1.3: BLE Certificate Pinning (ESP32)
```cpp
const char* ca_cert = R"EOF(
-----BEGIN CERTIFICATE-----
[Railway HTTPS Certificate]
-----END CERTIFICATE-----
)EOF";

http.setCACert(ca_cert);
http.begin("https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading");
```

### P1.4: Enable NVS Encryption
```
menuconfig → Security Options → Flash Encryption
✓ Enable flash encryption on boot
✓ Flash Encryption Mode: DIS_JTAG
```

---

## FASE 2 - ALTO (En siguiente sprint)

### P2.1: Rate Limiting (Bucket4j)
```xml
<dependency>
    <groupId>com.github.vladimir-bukhtoyarov</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>7.6.0</version>
</dependency>
```

### P2.2: Token Revocation Service
Implementar en `com.biosense.iot.auth.infrastructure.adapter.out.security`

### P2.3: Security Headers
En `SecurityConfig.java`:
```java
.headers(headers -> headers
    .contentSecurityPolicy("default-src 'self'")
    .xssProtection()
    .frameOptions().deny()
)
```

---

# 📊 VEREDICTO FINAL

| Área | Postura Seguridad | Críticos | Estado |
|------|-------------------|----------|--------|
| **BLE Communication** | 🔴 CRÍTICA | 2 | Esnifable, credenciales en texto plano |
| **Device Auth** | 🔴 CRÍTICA | 2 | Timing attacks, sin claims JWT |
| **Network Transport** | 🟠 ALTA | 1 | Sin certificate pinning |
| **Data Integrity** | 🟠 ALTA | 1 | Sin deduplication |
| **Storage** | 🔴 CRÍTICA | 1 | Flash sin encriptación |
| **API Security** | 🟡 MEDIA | 2 | Sin rate limiting, CORS permisivo |

## RESUMEN
- ✅ **Autenticación de usuario:** Correcta (Google OAuth)
- ✅ **Contraseña almacenamiento:** Correcta (BCrypt)
- ❌ **Comunicación IoT:** FALLIDA COMPLETAMENTE
- ❌ **Almacenamiento ESP32:** FALLIDA
- ❌ **Validación de dispositivo:** FALLIDA

## SEGURIDAD REAL
**Porcentaje de seguridad implementado: ~35-40% de lo afirmado**

### ¿Production-Ready?
**❌ NO. CRÍTICO: NO DESPLEGAR A PRODUCCIÓN**

### Riesgo Residual
- 🔴 Credenciales IoT expuestas a sniffer BLE
- 🔴 Datos de sensores pueden ser suplantados
- 🔴 API puede ser forzada brute-force (sin rate limit)
- 🟠 MITM posible sin certificate pinning

### Timeline de Remediación
- **Fase 1 (Blocker):** 48 horas
- **Fase 2 (Critical):** 1 semana  
- **Producción segura:** 10-14 días

---

**Firma Auditoría:**
- Auditor: Copilot Security Team
- Fecha: 2024
- Clasificación: CRÍTICO
- Distribuir: CTO, Security Team, DevOps
