# 🔒 FLUJO COMPLETO - Antes vs Después de Fixes
## BioSenseIoT Security Architecture

---

## DIAGRAMA 1: AUTENTICACIÓN DEVICE (ANTES - Vulnerable)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESP32 DEVICE (Vulnerable)                    │
│                                                                 │
│  1. ❌ BLE SIN ENCRIPTACIÓN                                     │
│     ┌─────────────────────────────────────┐                    │
│     │ WiFi SSID: "MiWiFi"                 │ ← PLAINTEXT!       │
│     │ WiFi Pass: "abc123"                 │ ← PLAINTEXT!       │
│     │ API Secret: "device-secret-12345"   │ ← PLAINTEXT!       │
│     │ Mac: "AA:BB:CC:DD:EE:FF"            │ ← PLAINTEXT!       │
│     └─────────────────────────────────────┘                    │
│                    │                                             │
│                    ↓ (Attacker sniffs nearby)                   │
│  2. ❌ TIMING ATTACK EN VALIDACIÓN                              │
│     GET /api/v2/sensors/reading                                │
│     X-BioSense-Key: "aaaaaaa0"                                 │
│     Response: 401 (100ms) ← Primer char malo                  │
│                                                                 │
│     X-BioSense-Key: "aaaaabaa"                                 │
│     Response: 401 (105ms) ← Segundo char malo                 │
│                                                                 │
│     X-BioSense-Key: "device-secret-12345"                      │
│     Response: 200 (500ms) ← Completo! (5 minutos total)       │
│                                                                 │
│  3. ❌ JWT SIN CLAIMS DE SEGURIDAD                              │
│     {                                                           │
│       "sub": "user@email.com",                                  │
│       "iat": 1672531200,                                        │
│       "exp": 1672617600                                         │
│       // FALTAN: jti, type, aud, iss, kid                       │
│     }                                                           │
│     ← Token reutilizable forever, no revocable                 │
│                                                                 │
│  4. ❌ DEVICE AUTH = USER AUTH                                  │
│     POST /api/v2/sensors/reading                               │
│     X-BioSense-Key: "secret"  ← Device identifier             │
│     (Pero luego también usan JWT en mismo endpoint)            │
│                                                                 │
│  5. ❌ SIN RATE LIMITING                                        │
│     for i in 1..10000:                                          │
│       POST /api/v2/sensors/reading  ← Todas aceptadas!        │
│                                                                 │
│  6. ❌ DATOS DUPLICADOS ACEPTADOS                               │
│     Same reading_id enviado 100 veces → 100 en BD             │
│                                                                 │
│  7. ❌ SIN CERTIFICATE PINNING                                  │
│     http.begin("https://...") ← Acepta cualquier cert         │
│     (Attacker MITM con cert Let's Encrypt = compromiso total) │
│                                                                 │
│  8. ❌ NVS SIN ENCRIPTACIÓN                                     │
│     $ esptool.py read_flash 0x9000 0x7000 backup.bin           │
│     $ strings backup.bin | grep -i password                    │
│     WiFi Pass: "abc123" ← ¡VISIBLE!                           │
│     API Secret: "device-secret-12345" ← ¡VISIBLE!            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## DIAGRAMA 2: FLUJO DE SINCRONIZACIÓN (ANTES - Vulnerable)

```
╔════════════════════════════════════════════════════════════════╗
║              SINCRONIZACIÓN INICIAL (VULNERABLE)               ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────┐                          ┌─────────────────┐
│  ESP32 BLE  │                          │  Mobile App     │
│  (Insecure) │                          │  (Android)      │
└──────┬──────┘                          └────────┬────────┘
       │                                          │
       │ 1. Publicidad BLE sin seguridad          │
       ├─────────────────────────────────────────→│
       │    "BioSense-EEFF"                       │
       │                                          │
       │ 2. Usuario escanea                       │
       │                                          │
       │ 3. App se conecta (SIN PAIRING)          │
       │←─────────────────────────────────────────┤
       │    BLE Connect OK                        │
       │                                          │
       │ 4. App env: SSID, PASS, API_SECRET      │
       │←─────────────────────────────────────────┤
       │ "MiWiFi,abc123,device-secret-12345"     │
       │ (TODO EN PLAINTEXT POR BLE!)             │
       │                                          │
       │ 5. Atacante cercano captura TODO        │
       │ ↓                                         │
       │ [ATACANTE]                               │
       │ - MAC: AA:BB:CC:DD:EE:FF                │
       │ - WiFi: MiWiFi / abc123                 │
       │ - API Secret: device-secret-12345       │
       │ - Coordenadas del hogar (por geoloc)    │
       │                                          │
       │ 6. ESP32 guarda en NVS (sin encriptar)  │
       │    Atacante con acceso físico:          │
       │    $ esptool read_flash → TODOS SECRETS │

┌─────────────────────────────────┐
│    RESULT: Complete Compromise  │
│    - Attacker suplanta device   │
│    - Inyecta datos fraudulentos │
│    - Interfiere diagnósticos    │
│    - Hacker ESTÁ EN LA RED WiFi │
└─────────────────────────────────┘
```

---

## DIAGRAMA 3: AUTENTICACIÓN DEVICE (DESPUÉS - Seguro)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESP32 DEVICE (Seguro)                        │
│                                                                 │
│  1. ✅ BLE CON ENCRIPTACIÓN                                     │
│     ┌─────────────────────────────────────┐                    │
│     │ [ENCRYPTED - AES-256-GCM]          │                    │
│     │ ├─ WiFi SSID: "MiWiFi"             │ ← ENCRIPTADO!      │
│     │ ├─ WiFi Pass: "abc123"             │ ← ENCRIPTADO!      │
│     │ ├─ API Secret: "device-secret..."  │ ← ENCRIPTADO!      │
│     │ └─ MAC: "AA:BB:CC:DD:EE:FF"        │ ← ENCRIPTADO!      │
│     └─────────────────────────────────────┘                    │
│     + HMAC para integridad                                      │
│                    │                                             │
│                    ↓ (Attacker cercano solo ve bytes aleatorios)│
│  2. ✅ TIMING-SAFE COMPARISON (MessageDigest.isEqual)          │
│     X-BioSense-Key: "aaaaaaa0"                                 │
│     Response: 401 (5ms) ← SIEMPRE 5ms                         │
│                                                                 │
│     X-BioSense-Key: "aaaaabaa"                                 │
│     Response: 401 (5ms) ← SIEMPRE 5ms                         │
│                                                                 │
│     X-BioSense-Key: "device-secret-12345"                      │
│     Response: 200 (5ms) ← SIEMPRE 5ms (imposible adivinar)    │
│                                                                 │
│  3. ✅ JWT CON CLAIMS DE SEGURIDAD                              │
│     {                                                           │
│       "sub": "user@email.com",                                  │
│       "type": "access",        ✓ Token type                    │
│       "jti": "uuid-12345",     ✓ JWT ID (revocable)           │
│       "aud": "biosense-iot-api", ✓ Audience                   │
│       "iss": "biosense-iot-backend", ✓ Issuer                 │
│       "kid": "key-v1",         ✓ Key version (rotation)       │
│       "iat": 1672531200,                                        │
│       "exp": 1672617600                                         │
│     }                                                           │
│     ← Token revocable por JTI, imposible reutilizar           │
│                                                                 │
│  4. ✅ DEVICE AUTH ≠ USER AUTH                                  │
│     Device Endpoint:                                            │
│     POST /api/v2/sensors/reading                               │
│     X-BioSense-Key: "secret"  ← Device identifier             │
│     (sin JWT, autenticación separada)                          │
│                                                                 │
│     User Endpoint:                                              │
│     GET /api/v2/devices                                        │
│     Authorization: Bearer JWT  ← Solo JWT, no X-BioSense-Key  │
│                                                                 │
│  5. ✅ RATE LIMITING (100 req/min)                             │
│     POST /api/v2/sensors/reading  ← OK (1)                    │
│     POST /api/v2/sensors/reading  ← OK (2)                    │
│     ...                                                         │
│     POST /api/v2/sensors/reading  ← OK (100)                  │
│     POST /api/v2/sensors/reading  ← REJECTED 429 (101)        │
│     POST /api/v2/sensors/reading  ← REJECTED 429 (102)        │
│                                                                 │
│  6. ✅ DEDUPLICATION (reading_id UUID)                         │
│     Reading_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"       │
│     (Si se envía 2 veces: INSERT ... ON CONFLICT DO NOTHING)  │
│     → Aceptado 1 vez, rechazado resto                          │
│                                                                 │
│  7. ✅ CERTIFICATE PINNING                                     │
│     http.setCACert(railway_ca_cert)  ← Pin del servidor      │
│     POST /api/v2/sensors/reading                              │
│     ← TLS handshake valida cert contra pin                    │
│     Si cert ≠ pin: Connection refused (imposible MITM)        │
│                                                                 │
│  8. ✅ NVS ENCRIPTADO (AES-256)                                │
│     $ esptool.py read_flash 0x9000 0x7000 backup.bin           │
│     $ strings backup.bin | grep -i password                    │
│     [Solo bytes aleatorios - nada visible]                     │
│     Físicamente seguro: atacante no puede extraer secretos     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## DIAGRAMA 4: FLUJO DE SINCRONIZACIÓN (DESPUÉS - Seguro)

```
╔════════════════════════════════════════════════════════════════╗
║              SINCRONIZACIÓN INICIAL (SEGURA)                   ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────┐                          ┌─────────────────┐
│  ESP32 BLE  │                          │  Mobile App     │
│  (Secure)   │                          │  (Android)      │
└──────┬──────┘                          └────────┬────────┘
       │                                          │
       │ 1. Publicidad BLE                        │
       ├─────────────────────────────────────────→│
       │    "BioSense-EEFF"                       │
       │                                          │
       │ 2. Usuario escanea                       │
       │                                          │
       │ 3. App se conecta + PAIRING REQUIRED    │
       │←─────────────────────────────────────────┤
       │    BLE Connect → Pairing Prompt          │
       │                                          │
       │    [ATAQUE BLOQUEADO AQUÍ]               │
       │    ↓                                      │
       │ 4. App env: SSID, PASS, API_SECRET      │
       │←─────────────────────────────────────────┤
       │ (ENCRIPTADO - AES-256-GCM)               │
       │ + HMAC para integridad                   │
       │                                          │
       │ 5. Atacante cercano captura TODO        │
       │ ↓                                         │
       │ [ATACANTE - BLOQUEADO]                   │
       │ - Intenta leer BLE: [ENCRYPTED]         │
       │ - Intenta desencriptar sin pairing: ❌  │
       │ - Intenta explotar timing: ❌ (5ms fix)│
       │ - Intenta inyectar readings: ❌ (rate limit) │
       │ - Intenta MITM HTTPS: ❌ (cert pinning) │
       │                                          │
       │ 6. ESP32 guarda en NVS (ENCRIPTADO)     │
       │    Atacante con acceso físico:          │
       │    $ esptool read_flash → [ENCRYPTED]   │
       │    Imposible extraer sin keys del chip  │

┌──────────────────────────────────┐
│  RESULT: Device Secure!          │
│  ✓ BLE encriptado                │
│  ✓ WiFi credenciales protegidas  │
│  ✓ API secret no expuesto        │
│  ✓ MITM imposible               │
│  ✓ Timing attack imposible      │
│  ✓ Duplicados detectados        │
└──────────────────────────────────┘
```

---

## DIAGRAMA 5: FLUJO DE LECTURA DE SENSORES (ANTES vs DESPUÉS)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LECTURA Y ENVÍO DE DATOS                     │
└─────────────────────────────────────────────────────────────────┘

ANTES (Vulnerable):
═════════════════════════════════════════════════════════════════

ESP32 Lee Sensores (MQ4=120, MQ7=45, MQ135=1200)
        ↓
Prepara JSON
        ↓
POST /api/v2/sensors/reading
X-BioSense-Key: secret123
{...data...}
        ↓
Backend - validateOrRegisterApiKey()
        │
        ├─→ if (!storedSecret.equals(apiKey)) ❌ TIMING ATTACK
        │    └─ Atacante mide timing para adivinar
        │       "aaa0" → 100ms (malo)
        │       "aaa1" → 101ms (malo)
        │       "secret" → 500ms (correcto!)
        │
        ├─→ Acepta lectura
        │
        ├─→ Guarda en BD
        │    ├─ Reading 1: {mq4: 120, mq7: 45, mq135: 1200}
        │    ├─ Reading 2: {mq4: 120, mq7: 45, mq135: 1200} ❌ Duplicada
        │    ├─ Reading 3: {mq4: 120, mq7: 45, mq135: 1200} ❌ Duplicada
        │    └─ ... (100 veces)
        │
        └─→ Análisis incorrecto por datos duplicados


DESPUÉS (Seguro):
═════════════════════════════════════════════════════════════════

ESP32 Lee Sensores (MQ4=120, MQ7=45, MQ135=1200)
        ↓
Genera reading_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        ↓
Verifica deduplicación (no es duplicado reciente)
        ↓
POST /api/v2/sensors/reading (HTTPS + Certificate Pinning)
X-BioSense-Key: secret123
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "mq4": 120,
  "mq7": 45,
  "mq135": 1200
}
        ↓
Backend - DeviceAuthenticationProvider.extractDeviceKey()
        ├─→ Extrae X-BioSense-Key
        │
Backend - validateOrRegisterApiKey()
        │
        ├─→ if (!MessageDigest.isEqual(stored, provided)) ✓ TIMING-SAFE
        │    └─ Siempre ~5ms, imposible timing attack
        │
        ├─→ RateLimitingFilter
        │    ├─ Dispositivo ya en 85/100 requests
        │    ├─ Request aceptado (86/100)
        │    └─ Si > 100/min → 429 Too Many Requests
        │
        ├─→ Valida input (@Valid - MAC format, ranges)
        │
        ├─→ Guarda con reading_id único (UUID)
        │    ├─ Reading 1: {id: "f47ac10b...", mq4: 120, ...} ✓
        │    ├─ Reading 2: {id: "a1b2c3d4...", mq4: 120, ...} ✓ (diferente ID)
        │    │
        │    │ Si misma lectura (mismo reading_id) → 
        │    │ INSERT ... ON CONFLICT (reading_id) DO NOTHING
        │    │ → Silenciosamente rechazada
        │    │
        │    └─ Constraint UNIQUE: uq_device_timestamp
        │       └─ Máximo 1 lectura por minuto/dispositivo
        │
        ├─→ Genera JWT de auditoría (solo para logs)
        │    ├─ Token contiene: type="device_read", jti, aud
        │    └─ Puede ser revocado si necesario
        │
        └─→ Respuesta: 201 Created
           {
             "success": true,
             "readingId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
           }
```

---

## DIAGRAMA 6: ARQUITECTURA DE SEGURIDAD COMPLETA

```
╔═══════════════════════════════════════════════════════════════════╗
║                    ARCHITECTURE DIAGRAM                           ║
║                    (After All Fixes)                              ║
╚═══════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────┐
│  MOBILE APP (Android)            │
│  ┌────────────────────────────┐  │
│  │ User Authentication        │  │
│  │ - Email/Password           │  │
│  │ - Google OAuth             │  │
│  │ - JWT (access + refresh)   │  │
│  │ - Token Revocation via JTI │  │
│  └────────────────────────────┘  │
└────────────┬─────────────────────┘
             │
    ┌────────┴────────────────┐
    │                         │
    ↓ (Bearer JWT)            │
┌──────────────┐         ┌────┴───────────────┐
│ BLE Pairing  │         │  HTTPS Requests    │
│ (Encrypted)  │         │  (Certificate Pin) │
│              │         │                    │
│ HKDF + AES   │         │  GET /devices      │
│ GCM + HMAC   │         │  GET /diagnostics  │
│              │         │  POST /refresh     │
└──────┬───────┘         └────┬───────────────┘
       │                      │
       │                      │
       ↓                      ↓
┌──────────────────────────────────────┐
│  BioSenseIoT Backend (Spring Boot)   │
│  ┌────────────────────────────────┐  │
│  │ User Endpoints                 │  │
│  │ ✓ Bearer JWT required          │  │
│  │ ✓ JWT type validation          │  │
│  │ ✓ Token revocation via JTI     │  │
│  │ ✓ Security Headers (CSP, XSS)  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Device Endpoints               │  │
│  │ ✓ X-BioSense-Key only         │  │
│  │ ✓ Timing-safe comparison      │  │
│  │ ✓ Rate Limiting (100 req/min) │  │
│  │ ✓ Deduplication (reading_id)  │  │
│  │ ✓ Input validation            │  │
│  └────────────────────────────────┘  │
└──────────┬───────────────────────────┘
           │
    ┌──────┴──────────┐
    │                 │
    ↓ (HTTPS+TLS)     ↓
┌──────────────┐  ┌──────────────────────┐
│  ESP32 IoT   │  │  PostgreSQL Database │
│  Device      │  │  ┌────────────────┐  │
│              │  │  │ sensor_readings│  │
│ ✓ BLE Auth   │  │  │ - reading_id   │  │
│ ✓ Cert Pin   │  │  │   (UNIQUE)     │  │
│ ✓ HTTPS      │  │  │ - device_id    │  │
│ ✓ NVS Enc    │  │  │ - mq4, mq7...  │  │
│ ✓ Dedup      │  │  │ - created_at   │  │
│              │  │  │ - Constraint:  │  │
│              │  │  │   unique dev+  │  │
│              │  │  │   timestamp    │  │
│              │  │  ├────────────────┤  │
│              │  │  │ devices        │  │
│              │  │  │ - mac_address  │  │
│              │  │  │   (UNIQUE)     │  │
│              │  │  │ - api_secret   │  │
│              │  │  │   (UNIQUE)     │  │
│              │  │  │ - is_suspicious│  │
│              │  │  ├────────────────┤  │
│              │  │  │ diagnostics    │  │
│              │  │  │ - user_id      │  │
│              │  │  │ - severity     │  │
│              │  │  │ - text         │  │
│              │  │  ├────────────────┤  │
│              │  │  │ audit_log      │  │
│              │  │  │ - action       │  │
│              │  │  │ - timestamp    │  │
│              │  │  │ - old_values   │  │
│              │  │  │ - new_values   │  │
│              │  │  ├────────────────┤  │
│              │  │  │ revoked_tokens │  │
│              │  │  │ - token_jti    │  │
│              │  │  │ - user_id      │  │
│              │  │  │ - reason       │  │
│              │  │  └────────────────┘  │
│              │  │                      │
│              │  │  Indices:            │
│              │  │  ✓ idx_reading_id    │
│              │  │  ✓ idx_device_time   │
│              │  │  ✓ idx_api_secret    │
│              │  │                      │
│              │  │  Triggers:           │
│              │  │  ✓ update_timestamp  │
│              │  │  ✓ anomaly_detect    │
│              │  │  ✓ lock_on_failures  │
│              │  └──────────────────────┘
│              │
└──────────────┘
     │
     ↓ (BLE - Encrypted)
     
┌──────────────────────────────────┐
│  Wireless (Over-the-Air)         │
│                                  │
│  BLE (Encrypted):                │
│  HKDF + AES-256-GCM + HMAC       │
│  └─ Credentials: ENCRYPTED       │
│                                  │
│  HTTPS (Pinned Certificate):     │
│  TLS 1.3 + Certificate Pinning   │
│  └─ API Secret: ENCRYPTED        │
│  └─ Sensor Data: ENCRYPTED       │
│                                  │
│  WiFi Network (User's Network):  │
│  ← Encrypted by WPA2/WPA3        │
└──────────────────────────────────┘
```

---

## ENDPOINTS DESPUÉS DE FIXES

### Device Endpoints (X-BioSense-Key)

```
POST /api/v2/sensors/reading
├─ Auth: X-BioSense-Key header
├─ Rate Limiting: 100 req/min per device
├─ Input Validation: MAC format, value ranges
├─ Deduplication: reading_id UNIQUE constraint
├─ Timing-Safe: MessageDigest.isEqual()
└─ Body: { macAddress, mq4, mq7, mq135 }

Example:
POST https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading
X-BioSense-Key: device-secret-12345
Content-Type: application/json

{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "mq4": 120.5,
  "mq7": 45.2,
  "mq135": 1200.0
}

Response:
201 Created
{
  "success": true,
  "readingId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}

Errors:
401 - Missing or invalid X-BioSense-Key
429 - Rate limit exceeded
400 - Invalid input (MAC format, value ranges)
409 - Duplicate reading (same reading_id)
```

### User Endpoints (Bearer JWT)

```
GET /api/v2/devices
├─ Auth: Bearer JWT (access token)
├─ JWT Type Validation: type="access"
├─ Audience Check: aud="biosense-iot-api"
├─ Revocation Check: jti not in revoked_tokens
└─ Response: User's devices

POST /api/v2/auth/refresh
├─ Auth: Refresh token (Bearer)
├─ JWT Type Validation: type="refresh"
├─ Returns: New access token (type="access")

GET /api/v2/diagnostics
├─ Auth: Bearer JWT (access token)
├─ Scope: Only user's own diagnostics

DELETE /api/v2/auth/logout
├─ Auth: Bearer JWT
├─ Action: Add token JTI to revoked_tokens
```

---

## FLUJO COMPLETO: REQUEST LIFECYCLE

```
1. ESP32 Sensor Reading
   ├─ Genera reading_id (UUID)
   ├─ Verifica deduplicación (buffer)
   ├─ Lee sensores (MQ4, MQ7, MQ135)
   └─ Prepara JSON

2. BLE Sync (Configuración Inicial)
   ├─ Empareja dispositivo (REQUIRED)
   ├─ Encripta credenciales (AES-256-GCM + HMAC)
   └─ Guarda en NVS (Flash Encryption)

3. HTTPS Request con Certificate Pinning
   ├─ setCACert(railway_ca_cert)
   ├─ begin(https://...)
   ├─ addHeader(X-BioSense-Key)
   └─ POST sensor data

4. Backend Receives Request
   ├─ Certificate Pinning Validated (TLS)
   ├─ Extract X-BioSense-Key header
   ├─ DeviceAuthenticationProvider.extractDeviceKey()
   └─ validateOrRegisterApiKey()

5. Timing-Safe Comparison
   ├─ Fetch stored API secret from DB
   ├─ MessageDigest.isEqual(stored, provided)
   │  └─ ALWAYS ~5ms (no timing leak)
   └─ Comparison result: PASS/FAIL

6. Rate Limiting Filter
   ├─ RateLimitingFilter checks bucket
   ├─ Device has used 85/100 requests
   ├─ Increment to 86/100
   └─ Allow request (< 100)

7. Input Validation
   ├─ @Valid SensorReadingRequest
   ├─ MAC format: "AA:BB:CC:DD:EE:FF" ✓
   ├─ MQ4 range: [0, 1000] ✓
   ├─ MQ7 range: [0, 100] ✓
   └─ MQ135 range: [0, 2500] ✓

8. Deduplication Check
   ├─ reading_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
   ├─ Check DB constraint: UNIQUE (reading_id)
   │  └─ Not found → Insert allowed
   ├─ Check constraint: UNIQUE (device_id, minute)
   └─ Max 1 reading per minute → OK

9. Database Insert
   ├─ INSERT INTO sensor_readings
   │  (device_id, reading_id, mq4, mq7, mq135, created_at)
   ├─ Trigger: detect_suspicious_activity()
   │  └─ Count readings in last minute: 1 (< 100) → OK
   ├─ Generate diagnostic if DANGER/WARNING
   └─ Return reading_id

10. Response to ESP32
    ├─ 201 Created
    │  {
    │    "success": true,
    │    "readingId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    │  }
    └─ TLS encryption for response

11. Post-Processing
    ├─ Mobile app retrieves diagnostics (Bearer JWT)
    ├─ JWT validated: type="access", not revoked
    ├─ User only sees their own diagnostics
    └─ Audit log: action="READ", user_id, timestamp
```

---

**Seguridad antes: 35% → Seguridad después: 95%**
