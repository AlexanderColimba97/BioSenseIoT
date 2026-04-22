# 🔍 REFERENCE GUIDE - Navegación Rápida

## 📖 Tabla de Contenidos Completa

### 🎯 Comienza aquí
- **START_HERE.md** ← Resumen visual de lo que recibiste
- **README_v3.md** ← Índice maestro con decisión tree

---

### ⚡ Quiero compilar ya
```
→ QUICK_START.md
  - Paso 1: Preparar Arduino IDE (2 min)
  - Paso 2: Cargar código (1 min)
  - Paso 3: Compilar (1 min)
  - Paso 4: Flashear (1 min)
  - Paso 5: Monitoreo (1 min)
  [Total: 5-10 minutos]
```

---

### 📚 Quiero entender la arquitectura
```
→ REFACTORED_v3_GUIDE.md
  - Objetivo 1: Estabilidad Red [WiFi verification fix]
  - Objetivo 2: Lógica Vinculación [User binding flow]
  - Objetivo 3: Coexistencia Radio [BLE deinit]
  - Objetivo 4: Seguridad Payload [Authorization + JSON]
  - Objetivo 5: Optimización Loop [State machine]
  [Total: 15-20 minutos]
```

---

### 🔄 Voy a migrar de v2
```
→ MIGRATION_v2_to_v3.md
  - Sección: CAMBIOS PRINCIPALES LÍNEA POR LÍNEA
  - Comparación v2 SECURE vs v3 REFACTORED
  - Pasos de migración (opciones 1-2)
  - Checklist post-migración
  [Total: 10-15 minutos]
```

---

### 🧠 Necesito visualizar el flujo
```
→ STATE_MACHINE_DIAGRAM.md
  - State Transitions (diagrama ASCII)
  - State Details (3 estados explicados)
  - Transition Matrix (tabla de transiciones)
  - Timing Breakdown (duración de cada etapa)
  - Security Flow (diagrama de seguridad)
  [Total: 5-10 minutos]
```

---

### ✅ Voy a validar el código
```
→ VALIDATION_CHECKLIST.md
  - Pre-compilation checklist
  - Arduino IDE Settings verificación
  - 5 Tests de validación
  - Troubleshooting quick table
  [Total: 10-15 minutos]
```

---

### 💻 Necesito el código
```
→ biosense_esp32_REFACTORED.ino
  - 850 líneas compilables
  - Máquina de 3 estados
  - Non-blocking architecture
  - Production ready
```

---

## 🎯 DECISIÓN RÁPIDA (Decision Tree)

```
¿QUÉ NECESITAS?
│
├─→ Compilar en 5 minutos
│   └─ QUICK_START.md
│
├─→ Entender los cambios
│   └─ REFACTORED_v3_GUIDE.md
│
├─→ Migrar de v2
│   └─ MIGRATION_v2_to_v3.md
│
├─→ Ver diagrama de flujo
│   └─ STATE_MACHINE_DIAGRAM.md
│
├─→ Validar después de compilar
│   └─ VALIDATION_CHECKLIST.md
│
├─→ Ver resumen visual
│   └─ START_HERE.md
│
└─→ ¿Cuál archivo debo leer?
    └─ README_v3.md
```

---

## 📋 BÚSQUEDA POR PROBLEMA

### ❌ Mi ESP32 crashea con `assert failed: udp_new_ip_type`
```
→ REFACTORED_v3_GUIDE.md
  Sección: "Estabilidad de Red: Fix para `assert failed: udp_new_ip_type`"
  
Solución: Strict WiFi verification en sendReading()
```

---

### ❌ No sé cuándo está el dispositivo listo para usar
```
→ STATE_MACHINE_DIAGRAM.md
  Sección: "STATE DETAILS"
  
Diagrama: 3 estados claros (UNCONFIGURED → WARMUP → OPERATIONAL)
```

---

### ❌ El BLE no aparece en el escaneo
```
→ QUICK_START.md
  Sección: "TROUBLESHOOTING"
  
O busca en STATE_MACHINE_DIAGRAM.md
  Sección: "1️⃣ STATUS_UNCONFIGURED"
```

---

### ❌ Error compilación en Arduino IDE
```
→ QUICK_START.md
  Sección: "TROUBLESHOOTING"
  Solución: Error en línea X
```

---

### ❌ WiFi no conecta
```
→ QUICK_START.md
  Sección: "TROUBLESHOOTING"
  Solución: Verificar credenciales BLE
```

---

### ❌ Backend no recibe datos (HTTP 403/404)
```
→ REFACTORED_v3_GUIDE.md
  Sección: "Seguridad y Payload: Authorization Bearer + JSON Correcto"
  
O QUICK_START.md
  Sección: "Test 4: OPERATIONAL"
```

---

### ❌ El LED no hace lo que espero
```
→ STATE_MACHINE_DIAGRAM.md
  Sección: "STATE DETAILS"
  
  UNCONFIGURED: LED naranja parpadeando
  WARMUP: LED verde pulsando
  OPERATIONAL: LED rojo/naranja/verde (riesgo)
```

---

### ❌ ¿Cómo hago para migrar de v2?
```
→ MIGRATION_v2_to_v3.md
  Sección: "PASOS DE MIGRACIÓN"
  
  Opción 1: Reemplazo completo (recomendado)
  Opción 2: Migración gradual (para código legacy)
```

---

### ❌ ¿Qué significa cada línea de logs?
```
→ QUICK_START.md
  Sección: "LOGS ESPERADOS"
  
  Por cada estado: UNCONFIGURED, WARMUP, OPERATIONAL
```

---

## ⏱️ TIEMPO ESTIMADO

| Tarea | Tiempo | Archivo |
|-------|--------|---------|
| Compilar y flashear | 5 min | QUICK_START.md |
| Entender arquitectura | 20 min | REFACTORED_v3_GUIDE.md |
| Migrar de v2 | 15 min | MIGRATION_v2_to_v3.md |
| Visualizar flujo | 10 min | STATE_MACHINE_DIAGRAM.md |
| Validar | 10 min | VALIDATION_CHECKLIST.md |
| Leer todo | 60 min | Todos los archivos |

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

```
hardware/esp32_biosense/
│
├── 💻 CÓDIGO
│   └── biosense_esp32_REFACTORED.ino (850 líneas, production-ready)
│
├── 📖 ÍNDICES
│   ├── START_HERE.md (resumen visual, empieza aquí)
│   ├── README_v3.md (índice maestro, decision tree)
│   └── REFERENCE_GUIDE.md (este archivo)
│
├── ⚡ QUICK START
│   ├── QUICK_START.md (5 minutos a compilado)
│   └── VALIDATION_CHECKLIST.md (1 página imprimible)
│
├── 📚 DOCUMENTACIÓN TÉCNICA
│   ├── REFACTORED_v3_GUIDE.md (explicación completa)
│   ├── MIGRATION_v2_to_v3.md (línea por línea)
│   └── STATE_MACHINE_DIAGRAM.md (arquitectura visual)
│
└── 📚 REFERENCIA
    └── (Este archivo) REFERENCE_GUIDE.md
```

---

## 🔍 BÚSQUEDA RÁPIDA POR KEYWORD

### Palabra: "WiFi"
```
→ QUICK_START.md
  Sección: "TROUBLESHOOTING"
→ REFACTORED_v3_GUIDE.md
  Sección: "Estabilidad de Red"
→ STATE_MACHINE_DIAGRAM.md
  Sección: "WARMUP state details"
```

### Palabra: "BLE"
```
→ REFACTORED_v3_GUIDE.md
  Sección: "Coexistencia Radio"
→ STATE_MACHINE_DIAGRAM.md
  Sección: "UNCONFIGURED state details"
→ QUICK_START.md
  Sección: "Test 1: ¿Aparece BLE?"
```

### Palabra: "LED"
```
→ STATE_MACHINE_DIAGRAM.md
  Sección: "STATE DETAILS"
→ REFACTORED_v3_GUIDE.md
  Sección: "Lógica de Vinculación"
```

### Palabra: "Payload"
```
→ REFACTORED_v3_GUIDE.md
  Sección: "Seguridad y Payload"
→ QUICK_START.md
  Sección: "Test 4: ¿Envía al backend?"
```

### Palabra: "Backend"
```
→ QUICK_START.md
  Sección: "Test 4"
→ REFACTORED_v3_GUIDE.md
  Sección: "Seguridad y Payload"
```

### Palabra: "Serial Monitor"
```
→ QUICK_START.md
  Sección: "PASO 5: Monitoreo"
→ VALIDATION_CHECKLIST.md
  Sección: "Baud Rate: 115200"
```

### Palabra: "Compilación"
```
→ QUICK_START.md
  Sección: "PASO 3: Compilar"
→ QUICK_START.md
  Sección: "TROUBLESHOOTING"
```

### Palabra: "Estado"
```
→ STATE_MACHINE_DIAGRAM.md
  Todo el archivo (diagramas y detalles)
→ REFACTORED_v3_GUIDE.md
  Sección: "Optimización del Loop"
```

---

## 💡 TIPS DE NAVEGACIÓN

### Consejo 1: Imprime VALIDATION_CHECKLIST.md
```
- Una página
- Fácil de llevar
- Checklist durante validación
```

### Consejo 2: Lee START_HERE.md primero
```
- Te da panorama general
- 5 minutos
- Saber qué esperar
```

### Consejo 3: Bookmark QUICK_START.md
```
- Lo usarás varias veces
- Paso a paso claro
- Troubleshooting siempre útil
```

### Consejo 4: Abre STATE_MACHINE_DIAGRAM.md lado a lado
```
- Visualiza mientras compilas
- Entiende qué debería pasar
- Debuggea más fácil
```

### Consejo 5: Mantén VALIDATION_CHECKLIST.md a mano
```
- Valida después de compilar
- 5 tests rápidos
- Saber si funciona bien
```

---

## 🎓 RUTA DE APRENDIZAJE RECOMENDADA

**Para aprender bien (60 minutos):**

```
1. START_HERE.md (10 min)
   → Panorama general de qué recibiste

2. STATE_MACHINE_DIAGRAM.md (15 min)
   → Entender la arquitectura visual

3. REFACTORED_v3_GUIDE.md (20 min)
   → Leer los 5 objetivos

4. MIGRATION_v2_to_v3.md (10 min)
   → Ver cambios línea por línea

5. Compile biosense_esp32_REFACTORED.ino
   → Sigue QUICK_START.md

6. VALIDATION_CHECKLIST.md
   → Valida con los 5 tests
```

---

## 🚀 RUTA RÁPIDA (15 minutos)

```
1. QUICK_START.md (5 min)
   → Compilar + Flashear

2. Serial Monitor (5 min)
   → Ver logs

3. VALIDATION_CHECKLIST.md (5 min)
   → Validar
```

---

## 🎯 RUTA EXPERTA (5 minutos)

```
1. biosense_esp32_REFACTORED.ino
   → Abrir + Compilar (Ctrl+R)

2. Upload (Ctrl+U)

3. Serial Monitor (Ctrl+Shift+M)
   → Ver logs

4. ¡Listo!
```

---

## ✨ PRÓXIMOS PASOS SEGÚN TU NIVEL

### Principiante
```
→ START_HERE.md
→ QUICK_START.md
→ VALIDATION_CHECKLIST.md
→ Compila y valida
```

### Intermedio
```
→ README_v3.md
→ REFACTORED_v3_GUIDE.md
→ QUICK_START.md
→ Compila y valida
```

### Experto
```
→ biosense_esp32_REFACTORED.ino
→ Compila
→ Serial Monitor
→ ¡Listo!
```

---

**Este archivo es tu mapa. Elige tu ruta. ¡Adelante! 🚀**
