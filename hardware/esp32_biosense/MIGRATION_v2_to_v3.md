# GUÍA DE MIGRACIÓN: v2 SECURE → v3 REFACTORED

## 📝 Quick Summary

El código v2 (`biosense_esp32_SECURE.ino`) funcionaba pero tenía problemas de:
- ❌ Crashes WiFi (`assert failed: udp_new_ip_type`)
- ❌ No hay estado claro de "esperando vinculación"
- ❌ BLE sigue activo desperdiciando radio
- ❌ Posibles problemas de payload incompleto

El código v3 (`biosense_esp32_REFACTORED.ino`) resuelve todo esto con:
- ✅ Verificaciones estrictas de WiFi en cada send
- ✅ Máquina de 3 estados clara
- ✅ BLE deinit después de vinculación
- ✅ Payload siempre correcto con Bearer token

---

## 🔄 CAMBIOS PRINCIPALES LÍNEA POR LÍNEA

### 1. ENUM DE ESTADOS (NUEVO)

```cpp
// V2: No había máquina de estados explícita
// Lógica mezclada en setup() y loop()

// V3: Máquina de estados clara
enum DeviceState {
  STATUS_UNCONFIGURED = 0,   // Esperando BLE
  STATUS_WARMUP = 1,         // WiFi conectando + sensores calientando
  STATUS_OPERATIONAL = 2     // Listo para enviar datos
};

DeviceState currentState = STATUS_UNCONFIGURED;
```

**Por qué:** Hace el código predecible y debuggeable.

---

### 2. VARIABLES GLOBALES

```cpp
// V2:
bool bleActive = false;
bool blockUntilProvisioned = false;

// V3 (mejorado):
bool bleInitialized = false;
bool wifiConnected = false;

// Timers no-bloqueantes (NUEVO)
unsigned long lastReadTime = 0;
unsigned long lastBlinkTime = 0;
unsigned long stateChangeTime = 0;
unsigned long wifiRetryTime = 0;

// Estados
DeviceState currentState = STATUS_UNCONFIGURED;
```

**Por qué:** Los timers no-bloqueantes evitan freezes del ESP32.

---

### 3. FUNCIÓN DE CONEXIÓN WiFi

```cpp
// V2: Bloqueante y sin reintentos inteligentes
bool connectToWiFi(String ssid, String password) {
  WiFi.begin(ssid.c_str(), password.c_str());
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);  // ❌ Bloquea el ESP32 por 15 segundos
    attempts++;
  }
  return (WiFi.status() == WL_CONNECTED);
}

// V3: No-bloqueante con reintentos
bool connectToWifi(const String& ssid, const String& password) {
  if (WiFi.status() == WL_CONNECTED) {
    return true;  // Ya conectado
  }
  
  if (wifiConnected && WiFi.status() != WL_CONNECTED) {
    // Reconexión después de desconexión
    if (millis() - wifiRetryTime < WIFI_RETRY_INTERVAL) {
      return false;  // No intentes aún
    }
    wifiRetryTime = millis();
    WiFi.reconnect();
    return false;
  }
  
  if (!wifiConnected) {
    // Primera conexión
    WiFi.begin(ssid.c_str(), password.c_str());
    wifiRetryTime = millis();
    return false;
  }
  
  return false;
}
```

**Por qué:** No bloquea el loop, permite que BLE continúe respondiendo.

---

### 4. VERIFICACIÓN DE WiFi EN SEND

```cpp
// V2: Verificación insuficiente
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("❌ WiFi desconectado. Intentando reconexion...");
  if (WiFi.reconnect()) {
    delay(1500);  // ❌ Bloquea y posible UDP error
  }
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
}

// V3: Verificación estricta (STRICT VERIFICATION)
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("❌ WiFi not connected. Skipping send.");
  return false;  // Sale completamente, sin intentos
}
```

**Por qué:** Evita el error `assert failed: udp_new_ip_type`.

---

### 5. INICIALIZACIÓN DE BLE

```cpp
// V2: Siempre inicializa BLE
void setup() {
  // ...
  if (savedSSID == "") {
    blockUntilProvisioned = true;
    initializeBLE();
    startupTime = millis() + STARTUP_WARMUP_TIME;
  } else {
    // WiFi conectado, pero BLE sigue activo
    if (BLE_RECONFIG_ALWAYS_AVAILABLE) {
      Serial.println("📡 BLE reconfig enabled");
      initializeBLE();  // ❌ Desperdicia radio
    }
    // ...
  }
}

// V3: BLE solo en STATUS_UNCONFIGURED
void setup() {
  // ...
  if (apiSecret.length() == 0 || configuredSsid.length() == 0) {
    currentState = STATUS_UNCONFIGURED;  // BLE se inicializa aquí
  } else {
    currentState = STATUS_WARMUP;  // WiFi se prioriza
  }
}

void handleStateUnconfigured() {
  if (!bleInitialized) {
    initializeBLE();  // Solo inicializa cuando es necesario
  }
  blinkLedOrange();  // LED indica estado
}
```

**Por qué:** Libera recursos de radio cuando ya está vinculado.

---

### 6. DEINICIALIZACIÓN DE BLE (NUEVO)

```cpp
// V2: No existe deinicialización

// V3: Deinicializa BLE después de vinculación
void deinitializeBLE() {
  if (!bleInitialized) return;
  
  BLEDevice::deinit(true);  // true = full power down
  bleInitialized = false;
}

// Se llama cuando transiciona a STATUS_WARMUP:
if (newSecret.length() > 0 && newSsid.length() > 0) {
  currentState = STATUS_WARMUP;
  deinitializeBLE();  // ✅ Libera radio
}
```

**Por qué:** Mejora estabilidad WiFi, reduce interferencia RF.

---

### 7. MÁQUINA DE ESTADOS EN LOOP (COMPLETAMENTE NUEVA)

```cpp
// V2: Loop con lógica mezclada
void loop() {
  if (blockUntilProvisioned) {
    delay(1000);  // ❌ Bloquea esperando BLE
    return;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiRetryAttempt >= WIFI_RETRY_INTERVAL && configuredSsid.length() > 0) {
      // Intentar reconectar
    }
    delay(200);
    return;
  }
  
  if (millis() < startupTime) {
    // Warmup
    delay(500);
    return;
  }
  
  if (millis() - lastReadTime < SENSOR_SEND_INTERVAL_MS) {
    delay(100);
    return;
  }
  
  // ... lógica de lectura ...
}

// V3: Máquina de estados clara
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
  
  delay(50);  // Solo para WDT
}
```

**Por qué:** Estructura clara, fácil de debuggear, transiciones predecibles.

---

### 8. LED ORANGE BLINKING (NUEVO)

```cpp
// V2: No hay indicación clara de estado
// El LED solo indica riesgo (R/O/G)

// V3: LED naranja parpadea en STATUS_UNCONFIGURED
void blinkLedOrange() {
  if (millis() - lastBlinkTime >= LED_BLINK_INTERVAL) {
    lastBlinkTime = millis();
    ledBlinkState = !ledBlinkState;
    digitalWrite(LED_ORANGE, ledBlinkState ? HIGH : LOW);
  }
}

// En handleStateUnconfigured:
blinkLedOrange();  // Indica: esperando vinculación
```

**Por qué:** Usuario ve claramente que el dispositivo está esperando.

---

### 9. PAYLOAD JSON

```cpp
// V2: JSON incompleto a veces
String jsonPayload = "{"
    "\"deviceId\":\"" + macAddress + "\","
    "\"macAddress\":\"" + macAddress + "\","
    "\"co\":" + coStr + ","
    // ... campos variables ...
    "}";

// V3: JSON siempre completo
String jsonPayload = "{";
jsonPayload += "\"macAddress\":\"" + macAddress + "\",";
jsonPayload += "\"readingId\":\"" + readingId + "\",";
jsonPayload += "\"mq4\":" + String(sensorData.ch4, 2) + ",";
jsonPayload += "\"mq7\":" + String(sensorData.co, 2) + ",";
jsonPayload += "\"mq135\":" + String(sensorData.airQuality, 2) + ",";
jsonPayload += "\"timestamp\":" + String(epochNow);
jsonPayload += "}";
```

**Por qué:** Backend Spring Boot necesita exactamente estos campos.

---

### 10. AUTHORIZATION HEADER

```cpp
// V2: A veces inconsistente
String authHeader = "Bearer " + apiSecret;
http.addHeader("Authorization", authHeader);

// V3: Siempre presente en sendReading()
String authHeader = "Bearer " + apiSecret;

// Verificación estricta:
if (apiSecret.length() == 0) {
  Serial.println("❌ API Secret not configured. Skipping send.");
  return false;  // No intenta enviar sin auth
}

http.addHeader("Authorization", authHeader);  // Siempre añadido
```

**Por qué:** Evita errores 403 de autenticación.

---

### 11. HTTPS CLIENT

```cpp
// V2: Cliente con setup manual
HTTPClient http;
client.setInsecure();
http.begin(client, url);

// V3: Más claro y con mejor manejo
WiFiClientSecure client;
client.setInsecure();  // Skip SSL para Railway

HTTPClient http;
http.setConnectTimeout(6000);
http.setTimeout(12000);

if (!http.begin(client, url)) {
  Serial.println("❌ Failed to initialize HTTPS");
  return false;
}
```

**Por qué:** Mejor manejo de errores, timeouts configurables.

---

## 🚀 PASOS DE MIGRACIÓN

### Opción 1: Reemplazo Completo (RECOMENDADO)
```bash
1. Respaldar v2: cp biosense_esp32_SECURE.ino biosense_esp32_SECURE.backup.ino
2. Usar v3: biosense_esp32_REFACTORED.ino
3. Compilar y flashear
4. Monitorear con Serial Monitor
```

### Opción 2: Migración Gradual (Para código legacy)
Si tienes código personalizado, integra estos cambios:

1. **Reemplaza setup():**
   ```cpp
   // Reemplaza todo el bloque de inicialización con:
   preferences.begin("biosense", true);
   configuredSsid = preferences.getString("ssid", "");
   configuredPassword = preferences.getString("password", "");
   apiSecret = preferences.getString("api_secret", "");
   preferences.end();
   
   if (apiSecret.length() == 0 || configuredSsid.length() == 0) {
     currentState = STATUS_UNCONFIGURED;
   } else {
     currentState = STATUS_WARMUP;
   }
   ```

2. **Reemplaza loop():**
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
     delay(50);
   }
   ```

3. **Añade funciones de manejo de estado:**
   - `handleStateUnconfigured()`
   - `handleStateWarmup()`
   - `handleStateOperational()`

4. **Reemplaza sendReading():**
   ```cpp
   // Usa la versión v3 que incluye:
   // - Strict WiFi verification
   // - JSON completo
   // - Authorization Bearer
   ```

---

## ✅ CHECKLIST DE VALIDACIÓN POST-MIGRACIÓN

```
[ ] Compilación sin errores
[ ] Sin warnings de Arduino IDE

[ ] TEST 1: Arranque sin vinculación
    [ ] LED naranja parpadea
    [ ] BLE visible como "BioSense-XXXX"
    [ ] Serial: "UNCONFIGURED mode"

[ ] TEST 2: Vinculación por BLE
    [ ] App vincula credenciales
    [ ] ESP32 reinicia
    [ ] Serial: "Device bound. Entering WARMUP mode."

[ ] TEST 3: Transición WARMUP
    [ ] LED verde titila
    [ ] WiFi conecta
    [ ] Serial: "✅ WiFi connected"
    [ ] Espera 30s (warmup)

[ ] TEST 4: OPERATIONAL
    [ ] Serial: "ENTERING OPERATIONAL MODE"
    [ ] Cada 10s: "SENSOR DATA: CH4=X | CO=Y | Air=Z"
    [ ] Cada 10s: "✅ Reading sent successfully"

[ ] TEST 5: Pérdida de WiFi
    [ ] Desconecta WiFi de router
    [ ] Serial: "WiFi lost. Returning to WARMUP..."
    [ ] Reconecta automáticamente
    [ ] Serial: "WiFi connected" → "OPERATIONAL"

[ ] TEST 6: Backend Integration
    [ ] En Railway logs: GET requests exitosos (200/201)
    [ ] No más 404 en /diagnostics/latest
    [ ] Base de datos recibe readings correctamente

[ ] TEST 7: Power Consumption
    [ ] Medir consumo en STATUS_UNCONFIGURED (~80mA)
    [ ] Medir consumo en STATUS_OPERATIONAL (~120mA)
    [ ] Debe ser menor que v2 (BLE deinit = menos consumo)
```

---

## 🔍 LOGS ESPERADOS

### UNCONFIGURED
```
🔥 BIOSENSE IoT v3 - REFACTORED
📍 MAC: FF:AA:BB:CC:DD:EE
❌ Device not bound. Entering UNCONFIGURED mode.

📡 INITIALIZING BLE - WAITING FOR BINDING
   Name: BioSense-CCDD
✅ BLE READY - Waiting for app binding...
```

### WARMUP
```
✅ Device bound. Entering WARMUP mode.
📶 Connecting to WiFi...
✅ WiFi connected
   IP: 192.168.1.100

⏳ Warmup: 25s remaining
⏳ Warmup: 20s remaining
...
✅ WARMUP COMPLETE - ENTERING OPERATIONAL MODE
```

### OPERATIONAL
```
📊 SENSOR DATA: CH4=150.25 | CO=8.50 | Air=420.10

📤 Sending to backend...
   URL: https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading
   Payload: {"macAddress":"FF:AA:BB:CC:DD:EE",...}
   Response: 201
✅ Reading sent successfully
```

---

## ❌ ERRORES COMUNES Y SOLUCIONES

| Error | Causa | Solución |
|-------|-------|----------|
| `Compilation error: 'STATUS_UNCONFIGURED' not declared` | Falta el enum | Copiar enum `DeviceState` del inicio |
| `assert failed: udp_new_ip_type` | WiFi check insuficiente | ✅ Ya corregido en v3 |
| LED naranja no parpadea | BLE no en UNCONFIGURED | Asegurar que no hay api_secret en NVS |
| No recibe datos en backend | JSON payload incorrecto | Usar exactamente el JSON v3 |
| Crash cada 60s | Watchdog timeout | Usar `delay(50)` en loop, no `delay()` bloqueante |
| ESP32 se reinicia en WARMUP | WiFi timeout | Aumentar `WIFI_CONNECT_TIMEOUT` a 25000 |

---

## 📊 COMPARACIÓN FINAL

| Métrica | v2 SECURE | v3 REFACTORED |
|---------|-----------|---------------|
| Líneas de código | 805 | 850 (mejor documentado) |
| Estados explícitos | Implícito | 3 estados claros |
| Crashes WiFi | ❌ Sí | ✅ No |
| BLE en producción | ❌ Sí (desperdicio) | ✅ No (optimizado) |
| Non-blocking | ❌ Parcial | ✅ Sí |
| Payload correcto | ❌ Variable | ✅ Siempre |
| Auth Bearer | ❌ Inconsistente | ✅ Siempre |
| Consumo energía | Más alto | Más bajo (BLE off) |
| Debuggeable | ❌ Difícil | ✅ Fácil |

---

## 🎓 CONCLUSIÓN

La migración de v2 → v3 resuelve:
1. ✅ Crashes UDP
2. ✅ Flujo de vinculación claro
3. ✅ Radio coexistencia optimizada
4. ✅ Seguridad de payload
5. ✅ Arquitectura predecible

**Tiempo estimado de migración:** 15-30 minutos
**Compilación + flasheo:** 3-5 minutos
**Validación:** 10-15 minutos
