# 🎯 SOLUCIONES PARA SINCRONIZACIÓN ESP32 - GUÍA RÁPIDA

## 🔴 PROBLEMA ACTUAL
```
El ESP32 no aparece en Bluetooth desde la app
└─ Probablemente: Tiene credenciales WiFi guardadas de antes
                  y no entra en modo BLE discovery
```

---

## 🛠️ PASO 1: LIMPIAR CREDENCIALES (Hacer primero)

### Opción A: Factory Reset Rápido
```
1. Abre: hardware/esp32_biosense/ESP32-FACTORY-RESET.ino
2. Compila y carga en Arduino IDE
3. Abre Serial Monitor (115200 baud)
4. Espera el mensaje: "✅ FACTORY RESET COMPLETADO"
5. Se reinicia automáticamente
6. Ahora: Carga biosense_esp32_SECURE.ino nuevamente
```

**Resultado:** El ESP32 limpiará toda la memoria y volverá a modo BLE.

---

## 🚀 PASO 2: ELIGE UNA OPCIÓN

### ├─ OPCIÓN 1: MEJORAR BLUETOOTH ACTUAL ✅ (Recomendado para empezar)

**¿Cuándo usarla?**
- Necesitas cambiar WiFi frecuentemente
- Tienes múltiples dispositivos con redes diferentes
- Quieres máxima flexibilidad

**Pasos:**
1. ✅ Haz factory reset (paso 1)
2. ✅ Carga `biosense_esp32_SECURE.ino` normalmente
3. 📱 En la app: Sincroniza > Escanear Bluetooth
4. ⏱️ Espera ~8 segundos para que aparezca "BioSense-XXXXX"
5. 📝 Ingresa: WiFi SSID, contraseña, API Secret
6. ✅ Listo en ~20 segundos

**Ventajas:**
- ✅ Lo que ya tienes programado
- ✅ Flexible para múltiples redes
- ✅ Cambiar WiFi sin reprogramar

**Desventajas:**
- ❌ Requiere usar app cada vez que sincronizas
- ❌ Timeouts actuales muy cortos (8 seg)

**Si SIGUE SIN APARECER después de factory reset:**
- Aumentar timeouts en app (ver más abajo)
- Revisar que el módulo BLE no tenga fallos de hardware

---

### ├─ OPCIÓN 2: WiFi HARDCODEADO ⚡ (Más rápido)

**¿Cuándo usarla?**
- Solo tienes UNA red WiFi (o siempre la misma)
- Quieres que funcione apenas conectes la fuente
- No quieres usar app para sincronizar

**Pasos:**
1. Abre: `hardware/esp32_biosense/OPCION-2-WiFi-HARDCODEADO.ino`
2. Edita las líneas 16-18:
   ```cpp
   #define HARDCODED_SSID "TuRedWiFi"
   #define HARDCODED_PASSWORD "TuContraseña123"
   #define HARDCODED_API_SECRET "tu_api_secret"
   ```
3. Copia la lógica en setup() de biosense_esp32_SECURE.ino
4. Compila y carga
5. ✅ El ESP32 se conectará en ~3 segundos

**Ventajas:**
- ✅ Funciona automáticamente al encender
- ✅ Sin necesidad de app para sincronizar
- ✅ Muy rápido: ~3 segundos listo
- ✅ Perfecto para testing

**Desventajas:**
- ❌ Si cambias WiFi, necesitas reprogramar
- ❌ Credenciales en texto plano en el código
- ❌ Un dispositivo = Una red

**Implementación completa:**
```cpp
// En setup(), reemplaza esto:
if (savedSSID == "") {
  Serial.println("❌ No hay WiFi guardado.");
  initializeBLE();
}

// Por esto:
if (savedSSID == "") {
  Serial.println("📡 Usando WiFi hardcodeado...");
  savedSSID = HARDCODED_SSID;
  savedPassword = HARDCODED_PASSWORD;
  apiSecret = HARDCODED_API_SECRET;
}

bool wifiConnected = connectToWiFi(savedSSID, savedPassword);
if (!wifiConnected) {
  Serial.println("⚠️ WiFi falló. Reiniciando...");
  delay(3000);
  ESP.restart();
}
```

---

### ├─ OPCIÓN 3: WiFi PROVISIONING + BLE 🏆 (Lo mejor)

**¿Cuándo usarla?**
- Quieres lo mejor de ambos mundos
- Primera vez: Sincroniza por BLE (flexible)
- Después: Funciona automático sin BLE (rápido)

**Pasos:**
1. Abre: `hardware/esp32_biosense/OPCION-3-WiFi-PROVISIONING.ino`
2. Copia las funciones `setup_PROVISIONING()` y `loop_PROVISIONING_ADDITIONS()`
3. En biosense_esp32_SECURE.ino, reemplaza:
   ```cpp
   // REEMPLAZA void setup() CON:
   void setup() {
     setup_PROVISIONING();  // ← Usa versión provisioning
   }
   
   // MODIFICAR void loop() AGREGAR AL INICIO:
   void loop() {
     // ... (agregar lógica de reintentos WiFi)
     loop_PROVISIONING_ADDITIONS();
     
     // resto del código igual...
   }
   ```
4. Compila y carga
5. **Primera vez:** Sincroniza por BLE (10 seg)
6. **Después:** Se conecta automático (3 seg), reintentos c/10 seg si falla

**Ventajas:**
- ✅ Primera vez flexible (BLE) 
- ✅ Después automático (WiFi)
- ✅ Se reinicia automático, sin reiniciar
- ✅ Si WiFi falla, reintenta sin reiniciar
- ✅ Puedes cambiar WiFi en cualquier momento

**Desventajas:**
- ⚠️ Un poco más complejo
- ⚠️ Usa más memoria

**Flujo visual:**
```
├─ PRIMERA VEZ (Con dispositivo nuevo):
│  ├─ 1. Conecta a fuente
│  ├─ 2. Se anuncia en BLE como "BioSense-XXXXX"
│  ├─ 3. Usa app: Sincroniza > Escanea > Selecciona
│  ├─ 4. Completa WiFi + Secret
│  └─ 5. Reinicia automático (2 seg)
│
└─ DESPUÉS (Cada encendido):
   ├─ 1. Conecta a fuente
   ├─ 2. Intenta WiFi automáticamente (~3 seg)
   ├─ 3. ✅ Conectado - Envía lecturas
   └─ 4. Si WiFi falla → Reintenta cada 10 seg
```

---

## 🎯 MATRIZ DE DECISIÓN

| Necesidad | Opción | Razón |
|-----------|--------|-------|
| **Muchas redes WiFi** | 1 (Bluetooth) | Cambiar WiFi sin reprogramar |
| **Solo una red, debe ser rápido** | 2 (Hardcodeado) | Automático al encender, 3 seg |
| **Flexible pero automático** | 3 (Provisioning) | Mejor balance |
| **Testing rápido** | 2 (Hardcodeado) | Más simple de implementar |
| **Producción con cambios** | 3 (Provisioning) | Robusto y flexible |

---

## 📱 MEJORAS EN LA APP (Si OPCIÓN 1 sigue sin funcionar)

Si el ESP32 se limpia (factory reset) pero SIGUE sin aparecer en BLE,
edita en `frontend/components/SyncDeviceModal.tsx`:

**Línea 95:** Aumentar tiempo de scan
```typescript
// CAMBIAR DE:
setTimeout(async () => {
  await BleClient.stopLEScan();
  setScanning(false);
}, 8000);  // ← 8 segundos

// A:
}, 15000);  // ← 15 segundos
```

**Línea 130:** Aumentar timeout de conexión
```typescript
// CAMBIAR DE:
setTimeout(() => reject(new Error('Connection timeout')), 15000)

// A:
setTimeout(() => reject(new Error('Connection timeout')), 25000)  // ← 25 seg
```

**Línea 146:** Aumentar timeout de lectura
```typescript
// CAMBIAR DE:
const readTimeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Read timeout')), 10000)

// A:
timeout(() => reject(new Error('Read timeout')), 15000)  // ← 15 seg
```

**Línea 159:** Aumentar timeout de escritura
```typescript
// CAMBIAR DE:
const writePromise = BleClient.write(

// A (al final):
Promise.race([writePromise, 
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Write timeout')), 30000)
  )
])  // ← 30 segundos
```

---

## ✅ CHECKLIST DE DIAGNÓSTICO

- [ ] **Paso 1:** Factory reset del ESP32
- [ ] **Paso 2:** Carga biosense_esp32_SECURE.ino nuevamente
- [ ] **Serial Monitor 115200:** Ver "BLE Advertising Started" ?
- [ ] **Android Bluetooth:** ¿Aparece "BioSense-XXXXX" en settings?
- [ ] **App SyncDeviceModal:** ¿Detecta el dispositivo?
- [ ] **Leer MAC:** ¿Conecta y lee el MAC correctamente?
- [ ] **WiFi credenciales:** ¿Formato correcto "SSID,PASSWORD,SECRET"?
- [ ] **Reinicio automático:** ¿Se reinicia después de enviar credenciales?

Si TODAS pasan pero aún no funciona → Hay problema de hardware en el módulo BLE

---

## 🆘 TROUBLESHOOTING

**Problema:** "No aparece en Bluetooth"
- [ ] Factory reset (ESP32-FACTORY-RESET.ino)
- [ ] Aumentar timeouts de scan
- [ ] Revisar Serial Monitor: ¿dice "BLE Advertising"?

**Problema:** "Conecta pero no lee MAC"
- [ ] Aumentar timeout de lectura (línea 146)
- [ ] Revisar que characteristic UUID coincida

**Problema:** "Falla después de enviar credenciales"
- [ ] Verificar formato: "SSID,PASSWORD,SECRET"
- [ ] Revisar contraseña no tiene comas

**Problema:** "WiFi no conecta pero credenciales son correctas"
- [ ] RSSI muy bajo (WiFi lejana): Acerca el ESP32
- [ ] Credencial guardada corrupta: Factory reset
- [ ] Red 5GHz: Cambiar a 2.4GHz en router

---

## 🚀 RECOMENDACIÓN FINAL

**Para que funcione YA MISMO:**

1. **Ahora:** Factory reset del ESP32 (ESP32-FACTORY-RESET.ino)
2. **Después:** Usa OPCIÓN 2 (WiFi hardcodeado)
   - Edita SSID/Password
   - Carga en 5 minutos
   - Funciona sin app
   
3. **Cuando funcione:** Migra a OPCIÓN 3 (Provisioning) para máxima flexibilidad

---

## 📁 ARCHIVOS CREADOS

```
hardware/esp32_biosense/
├── ESP32-FACTORY-RESET.ino          ← Limpiar credenciales
├── OPCION-1-MEJORAR-BLUETOOTH.md    ← (el que ya tienes)
├── OPCION-2-WiFi-HARDCODEADO.ino    ← ⚡ Rápido
├── OPCION-3-WiFi-PROVISIONING.ino   ← 🏆 Lo mejor
└── biosense_esp32_SECURE.ino        ← Original
```

**¿Necesitas ayuda con alguna opción?** → Avísame cuál quieres implementar y te ayudo paso a paso
