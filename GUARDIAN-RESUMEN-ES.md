# 🏗️ Sistema Guardián de Arquitectura - RESUMEN EN ESPAÑOL

> **Todo lo que necesitas para mantener BioSenseIoT consistente, seguro y mantenible**

---

## 📋 ¿QUÉ HAS RECIBIDO?

Un sistema completo de **enforcement de arquitectura** con 7 archivos interconectados:

| Archivo | Propósito | Cuándo Leer |
|---------|-----------|-----------|
| **GUARDIAN-README.txt** | Introducción rápida | Primero (5 min) |
| **.instructions.md** | Reglas centrales | Segundo (15 min) |
| **ARCHITECTURE-GUARDIAN-GUIDE.md** | Flujo práctico | Tercero (45 min) |
| **validate-architecture.sh** | Validación automática | Antes de commits |
| **ARCHITECTURE-GUARDIAN-INDEX.md** | Referencia completa | Cuando necesites respuestas |
| **START-WITH-GUARDIAN.md** | Para principiantes | Introducción visual |
| **GUARDIAN-INTEGRATION.md** | Integración CI/CD | Para configuración |

---

## ⚡ COMIENZA AHORA (5 MINUTOS)

```bash
# 1. Lee la introducción rápida
cat GUARDIAN-README.txt

# 2. Entiende las reglas centrales
cat .instructions.md

# 3. Valida tu código actual
bash validate-architecture.sh
```

---

## 🎯 LAS TRES REGLAS SAGRADAS (MEMORIZA ESTAS)

### Regla 1: Autentica Correctamente
- JWT de Usuario ≠ JWT de Dispositivo
- NUNCA uses API keys
- Siempre usa Bearer token

### Regla 2: Confía Solo en el Servidor
- `deviceId` viene del JWT (servidor es la verdad)
- `deviceId` NUNCA del cuerpo de la solicitud
- Extrae en el servidor, valida siempre

### Regla 3: Mantén Las Capas Limpias
- **Controladores**: Rutear solicitudes
- **Servicios**: Lógica de negocio
- **Repositorios**: Acceso a base de datos
- ¡Sin mezclar!

---

## ✅ CÓMO HACERLO CORRECTO

```java
// ✅ CORRECTO: Endpoint de dispositivo con Bearer token
@PostMapping("/api/v2/sensors/reading")
@Secured("ROLE_DEVICE")
public Mono<Response> guardarLectura(
    @RequestHeader("Authorization") String token,
    @RequestBody SensorDTO dto
) {
    String deviceId = jwtService.extraerDeviceId(token);
    return sensorService.procesar(deviceId, dto);
}
```

```cpp
// ✅ CORRECTO: ESP32 enviando con Bearer token
void enviarDatos() {
    String token = preferences.getString("device_token");
    http.addHeader("Authorization", "Bearer " + token);
    int respuesta = http.POST(jsonPayload);
}
```

---

## 🚨 QUÉ RECHAZAR

```java
// ❌ INCORRECTO: API key
http.addHeader("X-BioSense-Key", secreto);

// ❌ INCORRECTO: deviceId del request
String deviceId = request.getParameter("deviceId");

// ❌ INCORRECTO: HTTP (no HTTPS)
"http://backend.com/api/..."

// ❌ INCORRECTO: Lógica de negocio en controlador
@PostMapping("/datos")
public void guardar() {
    // HACER CÁLCULOS AQUÍ ← ¡INCORRECTO!
}

// ❌ INCORRECTO: Secretos hardcodeados
private static final String SECRET = "super-secreto";
```

---

## 🔍 VALIDA TU CÓDIGO

```bash
bash validate-architecture.sh
```

**Salida**: 15 validaciones automáticas

```
✅ APROBADOS:     12 validaciones
⚠️  ADVERTENCIAS:  1 validación
❌ VIOLACIONES:   2 validaciones

🚨 CRÍTICO: 2 violaciones encontradas - DEPLOYMENT BLOQUEADO
```

---

## 📖 CÓMO USAR ESTOS ARCHIVOS

### Para Desarrolladores Backend
1. Lee `.instructions.md` (sección Backend)
2. Revisa `ARCHITECTURE-GUARDIAN-GUIDE.md` (PATTERN 1 & 2)
3. Antes de commit: `bash validate-architecture.sh`

### Para Desarrolladores Frontend
1. Lee `.instructions.md` (sección Frontend)
2. Revisa `ARCHITECTURE-GUARDIAN-GUIDE.md` (sección Bearer Token)
3. Antes de PR: `bash validate-architecture.sh`

### Para Ingenieros de Firmware (ESP32)
1. Lee `.instructions.md` (sección Hardware)
2. Revisa `ARCHITECTURE-GUARDIAN-GUIDE.md` (PATTERN 3)
3. Antes de release: `bash validate-architecture.sh`

### Para Arquitectos / Líderes de Equipo
1. Lee `.instructions.md` (completo)
2. Estudia `ARQUITECTURA-COMPLETA.md`
3. Enforce: Valida cada PR
4. Actualiza: Cuando cambie la arquitectura

---

## 🚀 PROCESO DE CODE REVIEW (6 PASOS)

Usa `ARCHITECTURE-GUARDIAN-GUIDE.md`:

1. **Identifica Componente** - ¿Qué es esto (controlador/servicio/firmware)?
2. **Traza Autenticación** - ¿Quién autentica (usuario/dispositivo)?
3. **Verifica Fuente de Datos** - ¿De dónde viene deviceId (JWT/request)?
4. **Revisa Lógica de Negocio** - ¿Está en la capa correcta?
5. **Evalúa Seguridad** - ¿Hay validación, están seguros los secretos?
6. **Decisión** - ¿Aprobar / Refactorizar / Rechazar?

---

## 🎓 PLAN DE APRENDIZAJE (4 DÍAS)

**Día 1**: Aprende las reglas
- Lee `.instructions.md` (30 min)
- Lee `ARCHITECTURE-GUARDIAN-GUIDE.md` (45 min)
- Lee `ARQUITECTURA-COMPLETA.md` secciones 1-4 (30 min)

**Día 2**: Entiende tu codebase
- Ejecuta `validate-architecture.sh` (5 min)
- Revisa violaciones (30 min)
- Estudia un patrón de ejemplo (20 min)

**Día 3**: Aplica a tu código
- Escribe código siguiendo patrones (varía)
- Auto-revísate contra checklist (15 min)
- Ejecuta validación (2 min)

**Día 4**: Ayuda a tu equipo
- Revisa código del equipo usando framework
- Comparte patrones de la guía
- Enforza validación en PRs

---

## 📚 REFERENCIA RÁPIDA DE ARCHIVOS

**Necesito...** | **Leer...**
---|---
Aprender las reglas | `.instructions.md`
Revisar código | `ARCHITECTURE-GUARDIAN-GUIDE.md`
Ejecutar pruebas | `bash validate-architecture.sh`
Encontrar algo | `ARCHITECTURE-GUARDIAN-INDEX.md`
Entender arquitectura | `ARQUITECTURA-COMPLETA.md`
Vista visual | `RESUMEN-ARQUITECTURA.md`
Guía de inicio rápido | Este archivo
Integración CI/CD | `GUARDIAN-INTEGRATION.md`

---

## ✨ POR QUÉ IMPORTA

- **Consistente**: Todo código sigue los mismos patrones
- **Seguro**: Sin API keys, sin secretos hardcodeados
- **Mantenible**: Arquitectura limpia, fácil de extender
- **Escalable**: Sistema crece sin degradarse
- **Rápido**: Nuevos desarrolladores onboard más rápido
- **Automático**: Violaciones atrapadas antes de revisión

---

## 🎯 TU PRÓXIMO MOVIMIENTO

1. **Ahora**: Lee `.instructions.md` (10 min)
2. **Luego**: Lee `ARCHITECTURE-GUARDIAN-GUIDE.md` (30 min)
3. **Luego**: Ejecuta `bash validate-architecture.sh`
4. **Luego**: Revisa código existente usando la guía
5. **Siempre**: Referencia cuando codifiques o revises

---

## ❓ PREGUNTAS COMUNES

| Pregunta | Encuentra en |
|----------|-------------|
| ¿Qué es una red flag? | `ARCHITECTURE-GUARDIAN-GUIDE.md` → sección RED FLAGS |
| ¿Cómo implemento esto? | `ARCHITECTURE-GUARDIAN-GUIDE.md` → sección PATTERNS |
| ¿Qué reglas me aplican? | `ARCHITECTURE-GUARDIAN-INDEX.md` → sección YOUR ROLE |
| ¿Dónde está el checklist? | `ARCHITECTURE-GUARDIAN-GUIDE.md` → sección WORKFLOW |
| Necesito una respuesta rápida | `ARCHITECTURE-GUARDIAN-INDEX.md` → sección QUICK ANSWERS |

---

## 🏆 CRITERIOS DE ÉXITO

Estás usando Guardian exitosamente cuando:

- ✅ Nuevo código sigue reglas automáticamente
- ✅ Revisiones de código referencian la documentación
- ✅ `validate-architecture.sh` pasa
- ✅ Zero violaciones de API key
- ✅ JWT usado consistentemente
- ✅ Todos los endpoints protegidos
- ✅ Arquitectura limpia mantenida
- ✅ Nuevas violaciones atrapadas rápidamente

---

## 📌 RECUERDA

Este sistema existe para:
- **Ahorrar tiempo** (automatizar validaciones)
- **Prevenir bugs** (patrones consistentes)
- **Mantener calidad** (todo código sigue reglas)
- **Permitir escalado** (crecer sin romper)
- **Documentar decisiones** (¿por qué se diseñó así?)

**No es burocracia. Es LIBERACIÓN.**

Reglas claras → Desarrollo más rápido
Patrones consistentes → Menos bugs
Automatización → Más tiempo para trabajo real
Buena arquitectura → Sostenibilidad a largo plazo

---

## 🚀 ¿LISTO?

**Próximo archivo a leer: `.instructions.md`** (obligatorio, 15 minutos)

Esto te enseñará las reglas principales en las que todo lo demás se construye.

---

## 📁 ESTRUCTURA COMPLETA DEL GUARDIAN

```
BioSenseIoT/
├── GUARDIAN-README.txt              ← Inicio rápido
├── GUARDIAN-RESUMEN-ES.md           ← Este archivo (español)
├── START-WITH-GUARDIAN.md           ← Para principiantes
├── GUARDIAN-INTEGRATION.md          ← Integración CI/CD
├── .instructions.md                 ← Reglas centrales
├── ARCHITECTURE-GUARDIAN-GUIDE.md   ← Flujo práctico
├── ARCHITECTURE-GUARDIAN-INDEX.md   ← Referencia completa
├── validate-architecture.sh         ← Validador automático
├── ARQUITECTURA-COMPLETA.md         ← Referencia profunda
└── RESUMEN-ARQUITECTURA.md          ← Vista visual
```

---

## ✅ LISTA DE VERIFICACIÓN RÁPIDA

- [ ] Leí GUARDIAN-README.txt
- [ ] Leí .instructions.md
- [ ] Executé validate-architecture.sh
- [ ] Leí ARCHITECTURE-GUARDIAN-GUIDE.md
- [ ] Entiendo las 3 Reglas Sagradas
- [ ] Sé qué es correcto vs incorrecto
- [ ] Entiendo el flujo de 6 pasos
- [ ] Listo para revisar código
- [ ] Listo para escribir código

Si todo está ✅, ¡estás listo para comenzar!

---

**Documento**: Sistema Guardián de Arquitectura - Resumen en Español  
**Versión**: 1.0  
**Estado**: ✅ Listo para usar  
**Creado**: 2024-04-20  

**Siguiente**: Lee `.instructions.md` (15 minutos)
