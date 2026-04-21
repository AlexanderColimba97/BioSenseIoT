# ESP32 SYNCHRONIZATION - VISUAL FLOW

## 🔴 PROBLEMA RAÍZ: ¿Por qué no aparece el dispositivo?

```
ESTADO ACTUAL DEL ESP32:

┌─────────────────────────────────────────────────┐
│  ESP32 ENCENDIDO                                │
│                                                 │
│  ① Lee credenciales WiFi guardadas             │
│     └─ PROBLEMA: Tiene credenciales de antes!  │
│                                                 │
│  ② Si TIENE credenciales:                      │
│     ├─ Intenta conectar a esa red WiFi         │
│     ├─ Si falla → Reinicia                     │
│     └─ ❌ NUNCA entra en BLE                    │
│                                                 │
│  ③ Si NO tiene credenciales:                   │
│     ├─ Inicia modo BLE discovery                │
│     ├─ Se anuncia como "BioSense-XXXXX"        │
│     └─ ✅ Aparece en la app                    │
│                                                 │
└─────────────────────────────────────────────────┘

SOLUCIÓN: Limpiar las credenciales guardadas
          para que entre en modo BLE nuevamente
```

---

## 🛠️ ÁRBOL DE DECISIÓN

```
¿Necesitas cambiar WiFi frecuentemente?
│
├─ SÍ (múltiples redes)
│  └─ OPCIÓN 1: Bluetooth + Provisioning
│     ├─ Ventajas: Flexible, cambiar SSID sin reprogramar
│     ├─ Tiempo: ~20 seg por sincronización
│     └─ Complejidad: Media (ya está implementado)
│
└─ NO (solo una red siempre)
   │
   ├─ ¿Quieres que funcione automáticamente?
   │  │
   │  ├─ SÍ, sin nada extra
   │  │  └─ OPCIÓN 2: WiFi Hardcodeado ⚡
   │  │     ├─ Ventajas: Muy rápido (3 seg), automático
   │  │     ├─ Desventajas: Reprogramar si WiFi cambia
   │  │     └─ Complejidad: Baja
   │  │
   │  └─ SÍ, pero flexible si WiFi cambia
   │     └─ OPCIÓN 3: WiFi Provisioning 🏆
   │        ├─ Ventajas: Automático + Flexible + Robusto
   │        ├─ Tiempo: 3 seg después de 1ª sincronización
   │        └─ Complejidad: Media-Alta
```

---

## 📊 COMPARATIVA DE OPCIONES

```
┌────────────────────┬────────────┬──────────────┬──────────────┐
│ CARACTERÍSTICA     │ OPCIÓN 1   │ OPCIÓN 2     │ OPCIÓN 3     │
│                    │ Bluetooth  │ Hardcodeado  │ Provisioning │
├────────────────────┼────────────┼──────────────┼──────────────┤
│ Tiempo 1ª vez      │ ~20 seg    │ ~3 seg       │ ~10 seg      │
│ Tiempo después     │ ~20 seg    │ ~3 seg       │ ~3 seg       │
├────────────────────┼────────────┼──────────────┼──────────────┤
│ Cambiar WiFi       │ ✅ Si      │ ❌ No        │ ✅ Si        │
│ Automático         │ ✅ Si      │ ✅ Si        │ ✅ Si        │
│ Usa BLE            │ ✅ Si      │ ❌ No        │ ✅ Solo 1ª   │
│ Reintentos auto    │ ❌ No      │ ⚠️ Reinicia  │ ✅ Si        │
├────────────────────┼────────────┼──────────────┼──────────────┤
│ Complejidad código │ Media      │ Baja         │ Media-Alta   │
│ Complejidad UX     │ Media      │ Nula         │ Baja         │
└────────────────────┴────────────┴──────────────┴──────────────┘
```

---

## 🔄 FLUJOS DE EJECUCIÓN

### OPCIÓN 1: BLUETOOTH ACTUAL
```
ENCENDIDO
  ↓
Reset credenciales (Factory Reset)
  ↓
Inicia BLE
  ↓
App escanea durante 8 segundos
  ↓
¿Encuentra "BioSense-XXXXX"?
├─ NO → Error (revisar hardware)
└─ SÍ → Selecciona dispositivo
      ↓
      Lee MAC desde characteristic
      ↓
      Usuario ingresa: WiFi + Password + Secret
      ↓
      Escribe en BLE characteristic
      ↓
      ESP32 guarda en Preferences y reinicia
      ↓
      ✅ LISTO - Se conecta a WiFi automático
```

### OPCIÓN 2: WIFI HARDCODEADO
```
ENCENDIDO (incluso sin electricidad previa)
  ↓
Lee NVS/Preferences (está vacío)
  ↓
Usa credenciales HARDCODEADAS
  ↓
Conecta a WiFi en 3 segundos
  ↓
✅ LISTO - Envía datos al backend

┌─ Si WiFi falla:
│  └─ Reinicia automáticamente
│     └─ Reintenta conexión
```

### OPCIÓN 3: PROVISIONING (LO MEJOR)
```
PRIMERA VEZ (Dispositivo nuevo):
  ↓
Preferences vacío → Inicia BLE
  ↓
App: Sincroniza > Escanea > Selecciona
  ↓
Usuario: WiFi + Password + Secret
  ↓
ESP32 guarda + Reinicia automático
  ↓
DESPUÉS (Encendidos posteriores):
  ↓
Preferences tiene credenciales → Salta BLE
  ↓
Conecta WiFi en 3 segundos
  ↓
✅ LISTO - Envía datos

┌─ Si WiFi falla en cualquier momento:
│  └─ NO reinicia
│  └─ Reintenta cada 10 segundos
│  └─ Cuando vuelve a conectar → Envía datos
```

---

## 🎯 RECOMENDACIÓN SEGÚN CASO

### CASO 1: Testing rápido (ahora mismo)
```
┌─────────────────────────────────────────┐
│ OPCIÓN 2: WiFi Hardcodeado              │
├─────────────────────────────────────────┤
│ 1. Edita SSID/Password                  │
│ 2. Carga en 5 minutos                   │
│ 3. Funciona sin app                     │
│ 4. Perfecto para validar sensores       │
└─────────────────────────────────────────┘
```

### CASO 2: Desarrollo con múltiples redes
```
┌─────────────────────────────────────────┐
│ OPCIÓN 1: Bluetooth (ya tienes)         │
├─────────────────────────────────────────┤
│ 1. Factory reset                        │
│ 2. Aumenta timeouts en app              │
│ 3. Sincroniza por BLE                   │
│ 4. Cambia WiFi en app sin reprogramar   │
└─────────────────────────────────────────┘
```

### CASO 3: Producción (usuario final)
```
┌─────────────────────────────────────────┐
│ OPCIÓN 3: WiFi Provisioning             │
├─────────────────────────────────────────┤
│ 1. Implementa provisioning              │
│ 2. 1ª vez: sincroniza por BLE           │
│ 3. Después: automático (3 seg)          │
│ 4. Cambios WiFi: vuelve a BLE si falla  │
│ 5. Robusto sin reiniciar                │
└─────────────────────────────────────────┘
```

---

## ⚡ PASOS RÁPIDOS (AHORA MISMO)

```
PASO 1: Factory Reset
   └─ Carga: ESP32-FACTORY-RESET.ino
   └─ Tiempo: 2 minutos
   └─ Resultado: Credenciales borradas ✓

PASO 2: Elige opción
   ├─ RÁPIDO: OPCIÓN 2 (3 minutos de código)
   ├─ FLEXIBLE: OPCIÓN 1 (0 minutos, ya tienes)
   └─ PRODUCCIÓN: OPCIÓN 3 (10 minutos de código)

PASO 3: Prueba
   └─ Serial Monitor 115200
   └─ Verifica que detecte dispositivo
   └─ ✅ Listo
```

---

## 🔍 DEBUGGING - ¿QUÉ VER EN SERIAL MONITOR?

### ✅ ESPERADO (después de factory reset)
```
╔════════════════════════════════════════╗
║  BIOSENSE IoT - INICIALIZACIÓN        ║
╚════════════════════════════════════════╝

📍 MAC Address: AA:BB:CC:DD:EE:FF
🔐 Boot counter: 1
🔐 Boot nonce: 0x12345678

❌ No hay WiFi guardado. Entrando en modo SINCRONIZACIÓN.

📡 ===== INICIANDO MODO SINCRONIZACIÓN BLE =====
   Nombre BLE: BioSense-EE:FF
   MAC: AA:BB:CC:DD:EE:FF

✅ BLE COMPLETAMENTE OPERATIVO
📱 INSTRUCCIONES:
   1. Abre App BioSense
   2. Ve a MI PERFIL
   3. Toca SINCRONIZAR
   4. Toca Escanear Bluetooth
   5. Selecciona: BioSense-EE:FF
   6. Completa campos
   7. Toca Vincular

⏰ Esperando sincronización...
```

### ❌ PROBLEMA: No dice "BLE COMPLETAMENTE OPERATIVO"
```
Posible causa:
├─ Módulo BLE defectuoso
├─ Memoria insuficiente
├─ Conflicto con otra librería
└─ ESP32 incorrecta (debe ser ESP32 DevKit v1)
```

### ❌ PROBLEMA: Dice "WiFi connecting..." en lugar de BLE
```
Causa: Las credenciales WiFi NO fueron borradas
Solución: 
├─ Vuelve a correr ESP32-FACTORY-RESET.ino
└─ Verifica Serial Monitor que diga "FACTORY RESET COMPLETE"
```

---

## 📱 EN LA APP - DEBUGGING

### Serial Monitor de app (Chrome DevTools)
```javascript
// Agrega en SyncDeviceModal.tsx línea ~90
console.log('🔍 BLE Scan iniciado - Buscando 8 segundos...');

// En callback
console.log('📡 Dispositivo encontrado:', result.device.name);
```

### Si la app no detecta el BLE
```
1. ¿Android Bluetooth settings ve "BioSense-XXXXX"?
   ├─ SÍ: Problema en app (filtros, UUID)
   └─ NO: Problema en ESP32 (BLE no inicia)

2. ¿El nombre empieza exactamente con "BioSense"?
   ├─ SÍ: Debe funcionar
   └─ NO: Cambiar línea 346 en biosense_esp32_SECURE.ino
```

---

## 🎓 RECOMENDACIÓN FINAL

**Tu situación actual:**
- Login funciona ✅
- Device discovery falla ❌
- Causa: Credenciales WiFi guardadas bloqueando BLE

**Qué hacer AHORA:**
```
1. Factory Reset (ESP32-FACTORY-RESET.ino)      [2 min]
2. Carga biosense_esp32_SECURE.ino nuevamente   [1 min]
3. Verifica Serial: ¿dice "BLE OPERATIVO"?
   ├─ SÍ → Va a la app, sincroniza
   └─ NO → Revisa línea 390 en el código
```

**Si sigue sin aparecer en app después de esto:**
→ Los timeouts de app son demasiado cortos
→ Aumenta en SyncDeviceModal.tsx (ver SINCRONIZACION-ESP32-SOLUCIONES.md)

---

¿Necesitas que te guíe paso a paso con una de las opciones?
