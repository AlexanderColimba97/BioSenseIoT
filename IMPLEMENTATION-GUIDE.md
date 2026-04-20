# GUÍA DE INSTALACIÓN - SECURITY FIXES

## 🔧 BACKEND JAVA

### 1. Archivos Actualizados/Nuevos

```
backend/src/main/java/com/biosense/iot/
├── auth/infrastructure/security/jwt/
│   └── JwtAdapter.java ✅ ACTUALIZADO
│       - Timing-safe comparison
│       - Device token generation
│       - Enhanced validation
│
└── config/
    ├── SecurityConfig.java (sin cambios)
    ├── RateLimitingFilter.java ✅ NUEVO
    │   - Token bucket algorithm
    │   - Rate limiting implementation
    └── (Registrarlo como @Component)
```

### 2. Compilación

```bash
cd C:\Users\alexi\Desktop\BioSenseIoT\backend
mvn clean compile -q
mvn clean install -q
```

**Si hay errores:** Verificar que todas las dependencias estén disponibles.

### 3. Verificación de Imports

En `JwtAdapter.java`:
- ✅ `java.security.MessageDigest` - Para timing-safe comparison
- ✅ `java.util.HashMap`, `java.util.Map` - Para claims
- ✅ `io.jsonwebtoken.*` - JWT library

En `RateLimitingFilter.java`:
- ✅ `org.springframework.web.server.*` - WebFilter
- ✅ `java.util.concurrent.*` - Thread-safe collections
- ✅ `reactor.core.publisher.Mono` - Reactive support

---

## 📱 ESP32 FIRMWARE

### 1. Archivos

```
hardware/esp32_biosense/
└── biosense_esp32.ino ✅ ACTUALIZADO
    - Includes mbedtls
    - Buffer deduplication
    - Secure client setup
    - Reading ID tracking
```

### 2. Arduino IDE Setup

**Libraries necesarias (verificar/instalar):**
```
1. WiFi (built-in)
2. HTTPClient (built-in)
3. BLEDevice (ESP32 Core)
4. Preferences (built-in)
5. ArduinoJson 6.x (Install from Library Manager)
6. mbedtls (viene con ESP32 board package)
```

**Steps:**
1. Sketch → Include Library → Manage Libraries
2. Buscar: "ArduinoJson"
3. Instalar versión 6.x o superior

### 3. Compilación & Upload

```
1. Tools → Board → ESP32 Dev Module
2. Tools → Port → COM3 (o tu puerto)
3. Tools → Upload Speed → 921600
4. Sketch → Verify (F7) - Compilar
5. Sketch → Upload (Ctrl+U) - Subir
```

**Time:** ~2 minutos

---

## 🗄️ DATABASE MIGRATIONS

### 1. Archivo SQL

```
DATABASE-SECURITY-MIGRATION-V2.sql
- 13 operaciones SQL
- Todas idempotent (IF NOT EXISTS)
- Índices de performance
- Audit logging
```

### 2. Ejecución Automática (Flyway)

**Para producción:** Copiar a:
```
backend/src/main/resources/db/migration/
V2__Add_Security_Fixes.sql
```

Spring boot ejecutará automáticamente con Flyway.

### 3. Ejecución Manual (pgAdmin/psql)

```sql
-- En pgAdmin Query Tool o psql:
\i 'DATABASE-SECURITY-MIGRATION-V2.sql'

-- O copiar y pegar todo el contenido
```

**Verificación:**
```sql
-- Verificar nueva tabla
SELECT * FROM security_audit_log;

-- Verificar índices nuevos
\di idx_sensor_readings_reading_id

-- Verificar columas nuevas en devices
\d devices;
```

---

## ✅ CHECKLIST DE VALIDACIÓN

### Backend
- [ ] JwtAdapter.java compilado sin errores
- [ ] RateLimitingFilter.java en paquete `config`
- [ ] pom.xml sin cambios necesarios (dependencias OK)
- [ ] `mvn clean install` exitoso
- [ ] No hay warnings de import

### ESP32
- [ ] ArduinoJson instalado en Arduino IDE
- [ ] biosense_esp32.ino se compila (F7)
- [ ] No hay errores de includes
- [ ] Upload exitoso a la placa

### Database
- [ ] Migration SQL ejecutada
- [ ] `security_audit_log` table existe
- [ ] `reading_id` column en `sensor_readings`
- [ ] Índices creados correctamente
- [ ] No hay errores de constraint

---

## 🔍 VERIFICACIÓN DE FUNCIONALIDAD

### JWT Security
```java
// Timing-safe comparison está activo
JwtAdapter adapter = new JwtAdapter();
boolean valid = adapter.isTokenValid(token, email);  // ✅ Usa constantTimeEquals()

// Device tokens
String deviceToken = adapter.generateDeviceToken(deviceId, mac, userId);  // ✅ Con claims
```

### Rate Limiting
```
POST /api/v2/sensors/reading (sin token)
- Primer envío: ✅ 200 OK (token disponible)
- Después 20 envíos rápidos: ✅ 429 Too Many Requests
```

### ESP32 Deduplication
```
1. Lectura duplicada enviada 2x
2. Primera: Backend acepta, guarda
3. Segunda: ESP32 rechaza (isDuplicateReading=true)
4. No llega segunda al backend
```

---

## 🚨 TROUBLESHOOTING

### Backend no compila
```
Error: package com.biosense.iot.auth.infrastructure.security.jwt does not exist

Solución:
1. Verificar ruta exacta: backend/src/main/java/com/biosense/iot/auth/infrastructure/security/jwt/
2. Verificar JwtAdapter.java existe
3. mvn clean -q
4. Reintentar
```

### ESP32 no compila
```
Error: mbedtls/aes.h: No such file or directory

Solución:
1. Ir a Tools → Boards → esp32 (por espacio-free)
2. Download latest board package
3. O ignorar includes mbedtls (ya están disponibles automáticamente)
4. Comentar includes si causa problemas (se incluyen implícitamente)
```

### Database migration falla
```
Error: column "reading_id" already exists

Solución:
1. Migration es idempotent (IF NOT EXISTS)
2. Ejecutar de nuevo es seguro
3. Si falla: revisar que sensor_readings exista
```

---

## 📞 SOPORTE

### Logs importantes

**Backend:**
```
2024-01-15 10:30:45 - JwtAdapter initialized with timing-safe comparison
2024-01-15 10:30:46 - RateLimitingFilter registered
2024-01-15 10:30:47 - Client IP: 192.168.1.1 - Tokens: 20/20
```

**ESP32:**
```
🔐 Cargando credenciales del almacenamiento NVS encriptado...
✅ Credenciales encontradas.
✅ Datos guardados en la base de datos!
```

**Database:**
```sql
SELECT COUNT(*) FROM security_audit_log;  -- Debe retornar 0 inicialmente
SELECT COUNT(*) FROM jwt_token_revocation;  -- Debe retornar 0
```

---

## 📝 NOTAS IMPORTANTES

1. **Rate Limiting:** Está automático. Los endpoints públicos (auth, sensors/reading) no están limitados.

2. **JWT Device Tokens:** Usar `generateDeviceToken()` cuando se registre un device, no `generateAccessToken()`.

3. **Buffer Deduplication:** ESP32 mantiene 100 lecturas en memoria. Suficiente para ~16 minutos si falla internet.

4. **NVS Encryption:** ESP32 Preferences ya está encriptada por defecto con nvs encryption.

5. **Certificate Pinning:** Preparado pero NO habilitado. Habilitar cuando cert esté stable.

---

## 🎯 VALIDACIÓN FINAL ANTES DE PRODUCCIÓN

```bash
# Backend
cd backend
mvn clean package -q
java -jar target/iot-backend-0.0.1-SNAPSHOT.jar --server.port=8080 &

# Test JWT
curl -X POST http://localhost:8080/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test Rate Limiting
for i in {1..25}; do
  curl http://localhost:8080/api/v2/sensors/reading 2>&1 | grep -o "200\|429"
done
```

**Resultado esperado:**
- 20 × 200 OK
- 5+ × 429 Too Many Requests

✅ **Sistema listo para producción**
