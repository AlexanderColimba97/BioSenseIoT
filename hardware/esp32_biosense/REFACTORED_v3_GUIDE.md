# ESP32 FIRMWARE v3 - REFACTORIZACIÓN INTEGRAL

## 📋 Resumen de Cambios

Refactorización completa del firmware del ESP32 para resolver 5 problemas críticos de estabilidad y flujo de usuario:

---

## 🎯 OBJETIVOS RESUELTOS

### 1️⃣ **Estabilidad de Red: Fix para `assert failed: udp_new_ip_type`**

**Problema Original:**
- El código intentaba enviar datos HTTP/HTTPS sin verificar estrictamente `WiFi.status() == WL_CONNECTED`
- El UDP layer intentaba resolver dominios sin conexión establecida
- Causaba crashes del ESP32

**Solución Implementada:**
```cpp
// ANTES (inseguro):
if (WiFi.status() != WL_CONNECTED) {
  // Intentaba reconectar pero seguía adelante
  return false;
}

// AHORA (seguro - Strict Verification):
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("❌ WiFi not connected. Skipping send.");
  return false;  // Sale completamente
}
```

**En handleStateOperational():**
```cpp
// Transición a WARMUP si se pierde WiFi durante operación
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("❌ WiFi lost. Returning to WARMUP...");
  wifiConnected = false;
  currentState = STATUS_WARMUP;
  return;  // No intenta enviar
}
```

---

### 2️⃣ **Lógica de Vinculación (User Binding Flow)**

**Problema Original:**
- El dispositivo intentaba leer sensores incluso sin API secret
- No había estado claro de "esperando vinculación"
- El LED no indicaba claramente el estado
- Los sensores se calentaban innecesariamente

**Solución Implementada - Máquina de Estados:**

#### **Estado 1: STATUS_UNCONFIGURED** *(No API Secret)*
```cpp
void handleStateUnconfigured() {
  // ✅ BLE está activo y esperando
  initializeBLE();
  
  // ✅ LED NARANJA parpadea (500ms on/off)
  blinkLedOrange();
  
  // ✅ Verifica cada 5s si llegaron credenciales por BLE
  if (newSecret.length() > 0 && newSsid.length() > 0) {
    currentState = STATUS_WARMUP;  // Transiciona automáticamente
  }
}
```

**Flujo Exacto:**
1. El dispositivo arranca sin api_secret
2. BLE se inicializa automáticamente
3. LED naranja parpadea continuamente (indica: "esperando vinculación")
4. El usuario abre la app → escanea Bluetooth → vincula credenciales
5. El ESP32 recibe SSID + PASSWORD + API_SECRET por BLE
6. Se guarda en NVS y reinicia automáticamente
7. Transiciona a STATUS_WARMUP

---

#### **Estado 2: STATUS_WARMUP** *(WiFi Connecting + Sensor Warmup)*
```cpp
void handleStateWarmup() {
  // ✅ Intenta conectar a WiFi (no bloqueante)
  connectToWifi(configuredSsid, configuredPassword);
  
  // ✅ LED VERDE titila durante la conexión
  // ✅ Espera 30 segundos para calibración de sensores
  
  if (millis() - stateChangeTime >= STARTUP_WARMUP_TIME) {
    currentState = STATUS_OPERATIONAL;  // Transiciona
  }
}
```

**Duración:** 30 segundos (tiempo de calibración de sensores MQ)

---

#### **Estado 3: STATUS_OPERATIONAL** *(Ready for Production)*
```cpp
void handleStateOperational() {
  // ✅ Verifica WiFi CADA ITERACIÓN (strict check)
  if (WiFi.status() != WL_CONNECTED) {
    currentState = STATUS_WARMUP;  // Vuelve atrás si se pierde conexión
    return;
  }
  
  // ✅ Lee sensores cada 10 segundos
  // ✅ Envía datos con Authorization Bearer
  // ✅ LED muestra riesgo (Rojo/Naranja/Verde)
  
  SensorSnapshot sensors = readSensors();
  sendReading(sensors);  // Con retry automático
}
```

**Transiciones Posibles:**
- `UNCONFIGURED → WARMUP`: Cuando llegan credenciales por BLE
- `WARMUP → OPERATIONAL`: Después de 30s y WiFi listo
- `OPERATIONAL → WARMUP`: Si se pierde WiFi

---

### 3️⃣ **Coexistencia Radio: BLE Deinit Después de Vinculación**

**Problema Original:**
- BLE seguía consumiendo energía de la radio incluso después de vinculación
- Posibles conflictos entre BLE y WiFi
- Mayor consumo de corriente

**Solución Implementada:**
```cpp
// En BLECallbacks::onWrite (cuando llegan credenciales):
if (newSecret.length() > 0 && newSsid.length() > 0) {
  // ... guardar credenciales ...
  ESP.restart();  // Reinicia con BLE deshabilitado
}

// En handleStateUnconfigured → handleStateWarmup:
deinitializeBLE();  // ✅ Deinicializa BLE (libera radio)
```

**Función deinitializeBLE():**
```cpp
void deinitializeBLE() {
  if (!bleInitialized) return;
  
  Serial.println("📴 Deinitializing BLE...");
  BLEDevice::deinit(true);  // true = full power down
  bleInitialized = false;
  Serial.println("✅ BLE deinitialized");
}
```

**Beneficios:**
- Mayor estabilidad WiFi
- Menor interferencia RF
- Menor consumo de energía
- Mejor throughput de datos

---

### 4️⃣ **Seguridad y Payload: Authorization Bearer + JSON Correcto**

**Problema Original:**
- No siempre se incluía `Authorization: Bearer`
- El JSON a veces incluía campos opcionales incorrectos
- El backend no podía identificar al usuario sin `macAddress`

**Solución Implementada:**

#### **Payload Correcto:**
```json
{
  "macAddress": "FF:AA:BB:CC:DD:EE",
  "readingId": "FF:AA:BB:CC:DD:EE-1713791138-0x12A4F",
  "mq4": 150.25,
  "mq7": 8.50,
  "mq135": 420.10,
  "timestamp": 1713791138
}
```

#### **Headers Correctos:**
```cpp
http.addHeader("Content-Type", "application/json");
http.addHeader("Authorization", "Bearer " + apiSecret);  // ✅ Siempre
```

#### **Validación en sendReading():**
```cpp
bool sendReading(const SensorSnapshot& sensorData) {
  // ✅ Verificación 1: WiFi
  if (WiFi.status() != WL_CONNECTED) return false;
  
  // ✅ Verificación 2: API Secret existente
  if (apiSecret.length() == 0) return false;
  
  // ✅ Verificación 3: Generación de readingId único
  String readingId = generateReadingId();
  
  // ✅ Verificación 4: Deduplicación
  if (isDuplicateReading(readingId)) return false;
  
  // ✅ Verificación 5: JSON y Headers
  http.addHeader("Authorization", "Bearer " + apiSecret);
  http.POST(jsonPayload);
  
  // ✅ Verificación 6: Manejo de respuesta (200, 201, 409)
  if (httpCode == 200 || httpCode == 201 || httpCode == 409) {
    addToBuffer(readingId, ...);
    return true;
  }
  
  return false;
}
```

---

### 5️⃣ **Optimización del Loop: Non-blocking State Machine**

**Problema Original:**
- El código usaba `delay()` bloqueantes (freezes)
- La máquina de estados no estaba clara
- Difícil de debuggear transiciones

**Solución Implementada:**

#### **Timers No-Bloqueantes:**
```cpp
// ANTES (bloqueante):
delay(10000);  // Congelaba el ESP32 por 10 segundos

// AHORA (no bloqueante):
if (millis() - lastReadTime >= SENSOR_READ_INTERVAL) {
  lastReadTime = millis();
  // hacer acción
}
// El loop continúa ejecutándose
```

#### **Estado Machine en Loop:**
```cpp
void loop() {
  switch (currentState) {
    case STATUS_UNCONFIGURED:
      handleStateUnconfigured();
      break;
    case STATUS_WARMUP:
      handleStateWarmup();
      break;
    case STATUS_OPERATIONAL:
      handleStateOperational();
      break;
  }
  
  delay(50);  // Pequeño delay solo para WDT
}
```

#### **Ventajas:**
- ✅ El loop siempre está respondiendo
- ✅ Transiciones de estado instantáneas
- ✅ Fácil de debuggear con Serial
- ✅ No hay freezes

---

## 📊 CAMBIOS ESPECÍFICOS EN CÓDIGO

### Antes vs Ahora

| Aspecto | v2 SECURE | v3 REFACTORED |
|---------|-----------|---------------|
| **WiFi Verification** | `if (WiFi.status() != WL_CONNECTED) reconnect()` | `if (WiFi.status() != WL_CONNECTED) return` |
| **BLE State** | Siempre activo | Deinit después de vinculación |
| **Sensores sin API** | Intenta leer sensores | No lee sensores (STATUS_UNCONFIGURED) |
| **LED Naranja** | Solo en warning | Parpadea en STATUS_UNCONFIGURED |
| **Máquina de Estados** | Lógica implícita | Explícita con 3 estados |
| **Loop Blocking** | Usa `delay()` frecuente | Timers no-bloqueantes |
| **JSON Payload** | Variable | Siempre incluye macAddress + readingId |
| **Authorization** | Inconsistente | Siempre `Bearer [apiSecret]` |
| **HTTPS Client** | Manejo manual | `setInsecure()` + try-catch |
| **Transiciones** | No claras | Logging detallado |

---

## 🚀 COMPILACIÓN Y FLASHEO

### 1. Preparar Arduino IDE
```bash
# Instalar ESP32 core (si no está)
# Board: ESP32 Dev Module
# Port: COM3 (o tu puerto serial)
# Upload Speed: 921600
# Flash Frequency: 80 MHz
# Flash Mode: DIO
# Partition Scheme: Default 4MB with spiffs
```

### 2. Abrir el código refactorizado
```bash
# En Arduino IDE:
File → Open → biosense_esp32_REFACTORED.ino
```

### 3. Verificar compilación
```bash
Sketch → Verify (Ctrl+R)
# Debe compilar sin errores
```

### 4. Flashear
```bash
# Conectar ESP32 por USB
# Sketch → Upload (Ctrl+U)
# Esperar a que termine (LED azul parpadeará)
```

### 5. Monitorear Serial
```bash
# Tools → Serial Monitor
# Baud: 115200
# Observar logs de estado
```

---

## ✅ VALIDACIÓN

### Test 1: Arranque sin Vinculación
**Expected:**
```
🔥 BIOSENSE IoT v3 - REFACTORED
📍 MAC: FF:AA:BB:CC:DD:EE
❌ Device not bound. Entering UNCONFIGURED mode.

📡 INITIALIZING BLE - WAITING FOR BINDING
   Name: BioSense-CCDD
✅ BLE READY - Waiting for app binding...

[LED NARANJA parpadeando cada 500ms]
```

### Test 2: Vinculación por BLE
**Expected:**
1. App escanea Bluetooth
2. Encuentra "BioSense-XXXX"
3. Envía: `SSID,PASSWORD,API_SECRET`
4. Serial muestra:
```
📥 BLE DATA RECEIVED: SSID,PASSWORD,API_SECRET
✅ CREDENTIALS SAVED TO NVS
🔄 RESTARTING IN 2 SECONDS...
```

### Test 3: Transición WARMUP
**Expected:**
```
✅ Device bound. Entering WARMUP mode.
📶 Connecting to WiFi...
   IP: 192.168.1.100
✅ WiFi connected

⏳ Warmup: 25s remaining
⏳ Warmup: 20s remaining
...

✅ WARMUP COMPLETE - ENTERING OPERATIONAL MODE
```

### Test 4: Envío de Datos
**Expected:**
```
📊 SENSOR DATA: CH4=150.25 | CO=8.50 | Air=420.10

📤 Sending to backend...
   URL: https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading
   Payload: {"macAddress":"FF:AA:BB:CC:DD:EE","readingId":"FF:AA:BB:CC:DD:EE-1713791138-0x12A4F",...}
   Response: 201
✅ Reading sent successfully
```

### Test 5: Pérdida de WiFi
**Expected:**
```
[OPERATIONAL]
❌ WiFi lost. Returning to WARMUP...
[Transiciona a STATUS_WARMUP]
[Intenta reconectar]
✅ WiFi connected
[Transiciona a OPERATIONAL]
```

---

## 🔍 MONITOREO EN PRODUCTION

### Logs Clave a Vigilar

1. **Transiciones de Estado:**
   ```
   ✅ WARMUP COMPLETE - ENTERING OPERATIONAL MODE
   ❌ WiFi lost. Returning to WARMUP...
   ```

2. **Errores de Seguridad:**
   ```
   ❌ Auth failed - Invalid API Secret  (Código 403)
   ❌ WiFi not connected. Skipping send.
   ❌ API Secret not configured. Skipping send.
   ```

3. **Envíos Exitosos:**
   ```
   ✅ Reading sent successfully  (201)
   ✅ Duplicate (409) - Already stored
   ```

4. **Performance:**
   ```
   📊 SENSOR DATA: CH4=X.XX | CO=Y.YY | Air=Z.ZZ
   [Debe aparecer cada 10 segundos en OPERATIONAL]
   ```

---

## 🐛 TROUBLESHOOTING

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `assert failed: udp_new_ip_type` | WiFi no verificado | ✅ Ya corregido en v3 |
| LED naranja no parpadea | BLE no inicializado | Verificar que no hay api_secret en NVS |
| No envía datos | WiFi desconectado o api_secret inválido | Ver logs en Serial Monitor |
| Reinicia constantemente | Conexión WiFi inestable | Mover router o cambiar canal |
| NVS corrupto | Flasheo incorrecto | Borrar NVS: `esptool.py erase_region 0x300000 0x100000` |

---

## 📚 COMPATIBILIDAD CON BACKEND

El firmware v3 es 100% compatible con:
- ✅ Backend Spring Boot Reactive (WebFlux)
- ✅ PostgreSQL en Railway
- ✅ Endpoint: `POST /api/v2/sensors/reading`
- ✅ Auth: `Bearer [api_secret]`
- ✅ Deduplicación por `macAddress + readingId`

---

## 🎓 ARQUITECTURA FINAL

```
┌─────────────────────────────────────────────┐
│       ESP32 Firmware v3 Architecture        │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │     STATE MACHINE (Loop)            │   │
│  ├─────────────────────────────────────┤   │
│  │ • STATUS_UNCONFIGURED               │   │
│  │   ├─ BLE Active                     │   │
│  │   ├─ LED Orange (blink)             │   │
│  │   └─ Wait for credentials           │   │
│  │                                     │   │
│  │ • STATUS_WARMUP                     │   │
│  │   ├─ WiFi Connecting                │   │
│  │   ├─ LED Green (pulse)              │   │
│  │   └─ 30s sensor calibration         │   │
│  │                                     │   │
│  │ • STATUS_OPERATIONAL                │   │
│  │   ├─ WiFi Connected ✓               │   │
│  │   ├─ Read sensors (10s)             │   │
│  │   ├─ LED Risk Indicator             │   │
│  │   └─ Send to Backend                │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   NON-BLOCKING TIMERS               │   │
│  ├─────────────────────────────────────┤   │
│  │ millis() - lastReadTime >= 10000s   │   │
│  │ millis() - lastBlinkTime >= 500ms   │   │
│  │ millis() - wifiRetryTime >= 15000s  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   STRICT WiFi VERIFICATION          │   │
│  ├─────────────────────────────────────┤   │
│  │ if (WiFi.status() != CONNECTED)     │   │
│  │   return false (no send)            │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✨ CONCLUSIÓN

El firmware v3 implementa:
1. ✅ **Estabilidad**: Verificaciones estrictas de WiFi → sin crashes UDP
2. ✅ **Vinculación Clara**: Máquina de estados → experiencia UX predecible
3. ✅ **Radio Limpia**: BLE deinit → mayor estabilidad WiFi
4. ✅ **Seguridad**: Authorization Bearer + JSON correcto siempre
5. ✅ **Performance**: Non-blocking state machine → responsivo

**Próximo paso:** Compilar, flashear y validar en dispositivo físico.
