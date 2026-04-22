# QUICK START: Compilación y Flasheo v3

## ⚡ 5 MINUTOS A LISTO

### PASO 1: Preparar Arduino IDE (2 min)

```bash
1. Abrir Arduino IDE
2. Tools → Board → ESP32 Dev Module
3. Tools → Port → COM3 (tu puerto)
4. Tools → Upload Speed → 921600
5. Tools → Flash Frequency → 80 MHz
6. Tools → Flash Mode → DIO
7. Tools → Partition Scheme → Default 4MB with spiffs
```

**Verificar configuración:**
```
Board: ESP32 Dev Module
Port: COM3
Upload Speed: 921600
Flash Frequency: 80 MHz
Flash Mode: DIO
Partition Scheme: Default 4MB with spiffs
```

---

### PASO 2: Cargar Código (1 min)

```bash
1. File → Open
2. Navegar a: c:\Users\alexi\Desktop\BioSenseIoT\hardware\esp32_biosense\
3. Seleccionar: biosense_esp32_REFACTORED.ino
4. Abrir
```

---

### PASO 3: Compilar (1 min)

```bash
Sketch → Verify (Ctrl+R)

# Esperar a que termine
# Debe aparecer: "Compilation complete"
# Si hay errores, ver sección TROUBLESHOOTING abajo
```

**Verificación:**
```
Verifying sketch...
Compiling core...
Compiling libraries...
Linking everything...
Compilation complete.
```

---

### PASO 4: Flashear (1 min)

```bash
1. Conectar ESP32 por USB-C
2. Esperar 2 segundos a que sea detectado
3. Sketch → Upload (Ctrl+U)

# El LED azul del ESP32 debe parpadear
# Esperar mensaje: "Hash of data verified"
```

**Durante el flasheo:**
```
Connecting...
Uploading...
Running md5sum: ✓
Leaving...
Hard resetting via RTS pin...
```

---

### PASO 5: Monitoreo (1 min)

```bash
Tools → Serial Monitor (Ctrl+Shift+M)

# Configurar Baud: 115200
# El ESP32 debe mostrar logs

# Ver sección LOGS ESPERADOS para validar
```

---

## ✅ LOGS ESPERADOS (Para copiar y pegar en búsqueda)

### UNCONFIGURED (Sin vinculación)
```
🔥 BIOSENSE IoT v3 - REFACTORED
📍 MAC: FF:AA:BB:CC:DD:EE
❌ Device not bound. Entering UNCONFIGURED mode.
📡 INITIALIZING BLE - WAITING FOR BINDING
✅ BLE READY
```

**¿Ves esto?** ✅ Listo para vincular por BLE

---

### WARMUP (Después de vinculación)
```
✅ Device bound. Entering WARMUP mode.
📶 Connecting to WiFi...
✅ WiFi connected
✅ Clock synced
⏳ Warmup: 25s remaining
```

**¿Ves esto?** ✅ Esperando 30s de calibración

---

### OPERATIONAL (Listo para enviar)
```
✅ WARMUP COMPLETE - ENTERING OPERATIONAL MODE
📊 SENSOR DATA: CH4=150.25 | CO=8.50 | Air=420.10
📤 Sending to backend...
✅ Reading sent successfully
```

**¿Ves esto?** ✅ Todo funciona correctamente

---

## ❌ TROUBLESHOOTING RÁPIDO

### Error: `Port is busy` o no aparece COM3
**Solución:**
```bash
1. Desconectar USB
2. Esperar 3 segundos
3. Conectar USB nuevamente
4. Seleccionar puerto en Tools → Port
5. Si no aparece, instalar driver: CH340 (buscaren Google)
```

---

### Error: `Compilation error: expected ';' before '}'`
**Solución:**
```bash
1. Ir a línea del error (muestra número)
2. Verificar que no falten caracteres
3. Comprobar que se copió completo biosense_esp32_REFACTORED.ino
4. Recalcar (Ctrl+R)
```

---

### Error: `Fatal exception in exception handler` durante upload
**Solución:**
```bash
1. Desconectar USB
2. Presionar BOOT (botón negro del ESP32)
3. Mantener presionado
4. Conectar USB
5. Soltar BOOT
6. Ir a Sketch → Upload
```

---

### Serial Monitor muestra basura (caracteres raros)
**Solución:**
```bash
1. Tools → Serial Monitor
2. Verificar Baud: 115200 (abajo a la derecha)
3. Si sigue siendo basura, probar 9600 o 115200
4. Resetearel ESP32 (botón reset del devkit)
```

---

### ESP32 no aparece en puerto serial
**Solución:**
```bash
1. Instalar driver CH340:
   - Google: "CH340 driver Windows"
   - Descargar e instalar
   - Reiniciar Arduino IDE
   
2. Verificar que sea ESP32 Dev Module real
   
3. Probar otro cable USB (algunos son solo carga)
```

---

## 📋 CHECKLIST ANTES DE FLASHEAR

```
[ ] Arduino IDE configurada correctamente
[ ] Board: ESP32 Dev Module
[ ] Port: COM3 (o tu puerto)
[ ] Upload Speed: 921600
[ ] Archivo abierto: biosense_esp32_REFACTORED.ino
[ ] Compilación exitosa (Verify OK)
[ ] ESP32 conectado por USB
[ ] Driver CH340 instalado
```

---

## 🧪 TEST POST-FLASHEO (5 MIN)

### Test 1: ¿Aparece BLE? (2 min)
```
1. Serial Monitor: Ver "BLE READY"
2. Android phone: Settings → Bluetooth → Scan
3. Buscar "BioSense-XXXX"
4. Debe aparecer en lista

✅ Si aparece: OK
❌ Si no aparece: Reiniciar ESP32
```

---

### Test 2: ¿Lee sensores? (2 min)
```
1. Serial Monitor
2. Esperar a que aparezca:
   "📊 SENSOR DATA: CH4=X | CO=Y | Air=Z"

✅ Si aparece: OK
❌ Si no: Verificar pines analógicos (GPIO 34, 35, 32)
```

---

### Test 3: ¿Envía al backend? (1 min)
```
1. Serial Monitor
2. Buscar:
   "✅ Reading sent successfully"

✅ Si aparece: OK
❌ Si aparece "Auth failed 403": Verificar api_secret
❌ Si aparece "WiFi not connected": Verificar conexión WiFi
```

---

## 📱 VINCULAR POR BLE (Después de compilar)

```
1. Abrir app BioSense en Android
2. Ir a "MI PERFIL"
3. Tocar "SINCRONIZAR"
4. Tocar "Escanear Bluetooth"
5. Seleccionar "BioSense-XXXX"
6. Completas campos:
   - SSID: tu_red_wifi
   - PASSWORD: tu_contraseña
   - Dejar otros campos por defecto
7. Tocar "VINCULAR"
8. ESP32 reinicia automáticamente

Verificar en Serial Monitor:
"📥 BLE DATA RECEIVED: ..."
"✅ CREDENTIALS SAVED"
"🔄 RESTARTING"
```

---

## 🎯 RESUMEN

| Paso | Tiempo | Comando |
|------|--------|---------|
| Configurar IDE | 2 min | Tools → ... |
| Cargar código | 1 min | File → Open |
| Compilar | 1 min | Ctrl+R (Verify) |
| Flashear | 1 min | Ctrl+U (Upload) |
| Validar | 1 min | Serial Monitor |
| **TOTAL** | **~6 min** | |

---

## ⚠️ SI ALGO FALLA

```
1. Leer TROUBLESHOOTING arriba
2. Revisar que sea exactamente biosense_esp32_REFACTORED.ino
3. Verficar que Arduino IDE esté actualizado
4. Probar con otro cable USB
5. Si persiste: Hacer factory reset del ESP32:
   - Abrir Arduino IDE
   - Tools → Erase All Flash Before Sketch Upload
   - Subir sketch sin código (vacío)
   - Luego flashear v3 normalmente
```

---

## 📞 SOPORTE RÁPIDO

| Síntoma | Solución |
|---------|----------|
| No se ve puerto COM | Instalar driver CH340 |
| Compilation error | Copiar código completo de nuevo |
| Upload failed | Presionar BOOT durante upload |
| Serial muestra basura | Cambiar Baud 115200 |
| ESP32 no reinicia | Botón reset o desconectar USB |
| BLE no aparece | Ver "BLE READY" en Serial Monitor |
| No lee sensores | Verificar GPIO 34, 35, 32 no cortados |
| No envía al backend | Verificar api_secret en BLE vinculación |

---

## ✨ LISTO

Deberías ver en Serial Monitor:
```
🔥 BIOSENSE IoT v3 - REFACTORED
📍 MAC: FF:AA:BB:CC:DD:EE
❌ Device not bound. Entering UNCONFIGURED mode.
📡 INITIALIZING BLE - WAITING FOR BINDING
✅ BLE READY - Waiting for app binding...
```

**Próximo paso:** Vincular desde la app Android
