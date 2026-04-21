# 🔧 PLAN DE DEBUGGING - Ingesta de Sensores ESP32 → Backend

**Problema Identificado:** `HTTP Response: -1` en ESP32 (timeout HTTPS)  
**Estado:** El backend y firmware están correctamente implementados. El problema es de conectividad.

---

## 1️⃣ DIAGRAMA DE FLUJO (Dónde Puede Fallar)

```
ESP32 Firmware
    ↓
readSensors() ✅ (ADC → PPM OK)
    ↓
sendReading(snapshot) 
    ├─→ WiFi.isConnected() ✅ (192.168.28.7)
    ├─→ HTTPS POST https://biosenseiot-production-e061.up.railway.app/api/v2/sensors/reading
    │   └─→ ❌ HTTP Response: -1 (TIMEOUT - SSL/TLS error)
    │
    └─→ Reintentos con backoff (1s, 2s, 4s) - todos fallan con -1
        └─→ ❌ "No se pudo enviar lectura tras todos los reintentos"

Backend (Sin Logs)
    ├─→ ❓ ¿Está recibiendo la petición?
    ├─→ ❓ ¿SensorControllerV2 está siendo invocado?
    ├─→ ❓ ¿Los datos se guardan en sensor_readings?
    
PostgreSQL
    └─→ ❓ ¿Hay registros en sensor_readings?
```

---

## 2️⃣ QUERIES SQL DE VALIDACIÓN

### 2.1 Verificar que tabla sensor_readings existe y tiene estructura correcta
```sql
-- Describe tabla sensor_readings
\d sensor_readings;

-- O en PostgreSQL nativo:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sensor_readings'
ORDER BY ordinal_position;

-- Expected output:
-- column_name     | data_type                  | is_nullable
-- id              | bigint                     | NO
-- device_id       | integer                    | NO
-- reading_id      | character varying          | YES
-- mq4_value       | double precision           | NO
-- mq7_value       | double precision           | NO
-- mq135_value     | double precision           | NO
-- timestamp       | timestamp with time zone   | NO
```

### 2.2 Ver índices y constraints (deduplicación)
```sql
-- Ver constraints (UNIQUE para deduplicación)
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'sensor_readings';

-- Expected: uq_sensor_readings_device_reading_id (UNIQUE)

-- Ver índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'sensor_readings';

-- Expected: idx_sensor_readings_device_id, idx_sensor_readings_timestamp, etc.
```

### 2.3 Contar lecturas totales
```sql
SELECT COUNT(*) as total_readings 
FROM sensor_readings;

-- Si es 0 después de 10+ minutos → Las lecturas NO están llegando al backend
-- Si es > 0 → Las lecturas SÍ están llegando → Problema está en visualización
```

### 2.4 Ver últimas 10 lecturas para un dispositivo específico
```sql
-- Primero, obtener el device_id (asumiendo MAC: 00:00:00:00:00:00)
SELECT d.id, d.mac_address, d.device_name
FROM devices d
WHERE d.mac_address = '00:00:00:00:00:00';

-- Luego, ver lecturas (reemplaza 5 con el device_id obtenido)
SELECT id, device_id, reading_id, mq7_value as co, mq4_value as ch4, mq135_value as air_quality, timestamp
FROM sensor_readings
WHERE device_id = 5
ORDER BY timestamp DESC
LIMIT 10;

-- Output esperado:
-- id | device_id | reading_id                           | co    | ch4   | air_quality | timestamp
-- 1  | 5         | 00:00:00:00:00:00-9-712857d-75127   | 74.83 | 42.88 | 0.00        | 2026-04-21 14:25:30+00
-- 2  | 5         | 00:00:00:00:00:00-9-712857d-65092   | 51.87 | 87.28 | 0.00        | 2026-04-21 14:25:20+00
```

### 2.5 Verificar relación device ↔ user (si está linked)
```sql
-- Ver si dispositivo está linked a algún usuario
SELECT ud.user_id, u.email, d.device_name, d.mac_address
FROM user_devices ud
JOIN users u ON ud.user_id = u.id
JOIN devices d ON ud.device_id = d.id
WHERE d.mac_address = '00:00:00:00:00:00';

-- Output esperado:
-- user_id | email           | device_name      | mac_address
-- 1       | user@test.com   | Sensor Sala 1    | 00:00:00:00:00:00

-- Si no hay resultados → Device NO está linked → Backend rechaza con 403 FORBIDDEN
```

### 2.6 Verificar que apiSecret está almacenado
```sql
-- Ver API secret por MAC (este campo está en devices table)
SELECT d.id, d.mac_address, d.api_secret
FROM devices d
WHERE d.mac_address = '00:00:00:00:00:00';

-- Si api_secret es NULL → ESP32 no provisioned correctamente
-- Si api_secret != (valor que envía ESP32) → 401 UNAUTHORIZED
```

### 2.7 Contar lecturas por hora (para ver si hay patrón de ingesta)
```sql
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as readings_in_hour,
    AVG(mq7_value) as avg_co,
    AVG(mq4_value) as avg_ch4,
    AVG(mq135_value) as avg_air_quality
FROM sensor_readings
WHERE device_id = 5
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC
LIMIT 24;

-- Si el gráfico muestra 0 lecturas para todas las horas → Nada llega al backend
-- Si muestra picos → Las lecturas SÍ llegan (problema está en display/frontend)
```

### 2.8 Ver diagnósticos generados (si existen)
```sql
SELECT d.id, d.user_id, d.severity, d.diagnostic_text, d.recommendation, d.timestamp
FROM ai_diagnostics d
ORDER BY d.timestamp DESC
LIMIT 10;

-- Si es vacío → No se están generando diagnósticos
-- Si tiene datos → Las lecturas llegaron y se procesaron
```

### 2.9 Verificar que backend está escuchando en puerto 8080 (local)
```bash
# En tu máquina local donde corre el backend
netstat -tlnp | grep 8080

# O en Linux:
lsof -i :8080

# Output esperado: java process escuchando en 0.0.0.0:8080
```

---

## 3️⃣ ENDPOINTS DE DEBUG TEMPORAL (Ya Creados en Backend)

### 3.1 Verificar que debug endpoints están activos
```bash
# Este endpoint NO requiere autenticación
curl -s http://localhost:8080/debug/test-endpoint | jq .

# Output:
{
  "status": "ok",
  "endpoint": "POST /api/v2/sensors/reading",
  "requires": "Authorization: Bearer <apiSecret>",
  ...
}
```

### 3.2 Obtener últimas lecturas para un dispositivo
```bash
# Reemplaza XX:XX:XX:XX:XX:XX con la MAC real del ESP32
curl -s "http://localhost:8080/debug/latest-reading?macAddress=00:00:00:00:00:00&limit=10" | jq .

# Output esperado:
{
  "status": "success",
  "macAddress": "00:00:00:00:00:00",
  "deviceId": 5,
  "readingsCount": 10,
  "readings": [
    {
      "id": 1,
      "readingId": "00:00:00:00:00:00-9-712857d-75127",
      "mq7": 74.83,
      "mq4": 42.88,
      "mq135": 0.00,
      "timestamp": "2026-04-21T14:25:30Z"
    }
  ]
}

# Si devuelve 404 "not_linked" → Device no está linked
# Si devuelve 0 readings → Device linked pero sin datos en BD
# Si devuelve >0 readings → ¡Las lecturas SÍ llegan!
```

### 3.3 Resolver MAC → Device ID
```bash
curl -s "http://localhost:8080/debug/device-lookup?macAddress=00:00:00:00:00:00" | jq .

# Output esperado:
{
  "macAddress": "00:00:00:00:00:00",
  "status": "linked",
  "deviceId": 5,
  "userCount": 1
}

# Si status="not_linked" → Device NO está en BD o NO tiene usuarios asociados
```

---

## 4️⃣ LOGS QUE DEBES VER EN BACKEND

### 4.1 Logs de ingesta de sensores (si llegan POST requests)
```
[SENSORS] Ingest request mac=00:00:00:00:00:00 readingId=00:00:00:00:00:00-9-712857d-75127 mq7(co)=74.83 mq4(ch4)=42.88 mq135(airQuality)=0.00

[SENSORS] Ingest error mac=00:00:00:00:00:00 reason=Unlinked Device
```

### 4.2 Comandos para extraer logs
```bash
# En Railway o en local
# Ver últimos 100 logs que contengan "[SENSORS]"
kubectl logs <pod-id> | grep "\[SENSORS\]" | tail -100

# O si está en Railway:
# Ir a Railway → Your App → Logs → Buscar "[SENSORS]"

# O si corre local:
# En la consola de VS Code donde corre Spring Boot
# Buscar "[SENSORS]" en el output
```

### 4.3 Logs de error de seguridad (auth fallido)
```
[SENSORS] Ingest error mac=00:00:00:00:00:00 reason=Missing authorization header
[SENSORS] Ingest error mac=00:00:00:00:00:00 reason=Invalid authorization
```

---

## 5️⃣ CHECKLIST DE VALIDACIÓN (10 Pasos)

### PASO 1: Verificar conectividad ESP32 ↔ Backend
```
☐ ESP32 dice: ✅ WiFi conectado exitosamente! IP: 192.168.28.7
☐ URL del backend es correcta: https://biosenseiot-production-e061.up.railway.app
☐ POST es a: /api/v2/sensors/reading (verificar en código ESP32)
☐ Bearer token incluye "Bearer " + apiSecret (no solo apiSecret)
```

### PASO 2: Verificar que Device está linked en BD
```sql
-- Ejecutar en PostgreSQL
SELECT * FROM user_devices ud
JOIN devices d ON ud.device_id = d.id
WHERE d.mac_address = '00:00:00:00:00:00';

☐ Query devuelve al menos 1 fila (device linked)
☐ Si devuelve 0 filas → Device NO está linked → Error 403 FORBIDDEN en ESP32
```

### PASO 3: Verificar que apiSecret está correcto
```sql
-- En PostgreSQL
SELECT api_secret FROM devices WHERE mac_address = '00:00:00:00:00:00';

-- Comparar con lo que envía ESP32 en logs:
-- "SECRET: bsk_e6678bdc332a4f6cae80b047703eb98b"

☐ api_secret en BD = apiSecret que envía ESP32
☐ Si son diferentes → Error 401 UNAUTHORIZED
```

### PASO 4: Verificar que SensorControllerV2 está registrado
```bash
# En tu IDE o local backend
☐ GET http://localhost:8080/debug/test-endpoint → Status 200 OK
☐ Response incluye: "endpoint": "POST /api/v2/sensors/reading"
```

### PASO 5: Hacer POST de prueba al endpoint
```bash
# Desde tu máquina local (reemplaza valores)
curl -X POST http://localhost:8080/api/v2/sensors/reading \
  -H "Authorization: Bearer bsk_e6678bdc332a4f6cae80b047703eb98b" \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "00:00:00:00:00:00",
    "deviceId": "00:00:00:00:00:00",
    "co": 50.0,
    "ch4": 30.0,
    "airQuality": 100.0,
    "mq7": 50.0,
    "mq4": 30.0,
    "mq135": 100.0,
    "readingId": "test-manual-123",
    "timestamp": '"$(date +%s)"'
  }'

☐ Response status: 200 OK
☐ Response body: {"status":"success","id":123,"airQualityState":"..."}
☐ Ver en logs: "[SENSORS] Ingest request mac=00:00:00:00:00:00..."
```

### PASO 6: Verificar que datos se guardaron en BD
```sql
SELECT * FROM sensor_readings 
WHERE device_id = (SELECT id FROM devices WHERE mac_address = '00:00:00:00:00:00')
ORDER BY timestamp DESC 
LIMIT 1;

☐ Debería aparecer la lectura que acabas de enviar
☐ reading_id = "test-manual-123"
☐ timestamp cercano a ahora
```

### PASO 7: Verificar endpoint de debug
```bash
curl -s "http://localhost:8080/debug/latest-reading?macAddress=00:00:00:00:00:00&limit=5" | jq .

☐ Status: "success"
☐ readingsCount: > 0
☐ readings array tiene datos reales
```

### PASO 8: Revisar logs del backend (líneas claves)
```
En los logs del backend deberías ver:

✅ Si llegan datos:
[SENSORS] Ingest request mac=00:00:00:00:00:00 readingId=... mq7=50.0 mq4=30.0 mq135=100.0

❌ Si hay error de auth:
[SENSORS] Ingest error mac=00:00:00:00:00:00 reason=Invalid authorization

❌ Si device no está linked:
[SENSORS] Ingest error mac=00:00:00:00:00:00 reason=Unlinked Device

☐ Busca los logs anteriores
☐ Grep por "[SENSORS]" en logs
```

### PASO 9: Verificar que diagnósticos se generan
```sql
SELECT * FROM ai_diagnostics 
WHERE user_id = (SELECT user_id FROM user_devices 
                 WHERE device_id = (SELECT id FROM devices 
                                   WHERE mac_address = '00:00:00:00:00:00'))
ORDER BY timestamp DESC 
LIMIT 1;

☐ Debería aparecer 1+ diagnósticos si las lecturas llegaron
☐ severity: "LOW", "MEDIUM", "HIGH", o "CRITICAL"
```

### PASO 10: Frontend - Verificar que dashboard recibe datos
```
En la app:
☐ Ir a Dashboard
☐ Device debe mostrar: CO, CH4, Air Quality valores reales
☐ NO debe estar en "Sistema en espera"
☐ Cards deben tener color (verde/naranja/rojo según riesgo)
```

---

## 6️⃣ TROUBLESHOOTING - POSIBLES CAUSAS DE HTTP -1

| Síntoma | Causa Probable | Solución |
|---------|---|---|
| HTTP -1 siempre en ESP32 | SSL/TLS certificate validation fail | Deshabilitar `client.setInsecure(true)` NO es suficiente. Probar con `https://` vs `http://` |
| HTTP -1, pero `curl` funciona desde CLI | Certificate pinning o mismatch de hostname | Verificar que hostname en URL ESP32 = real hostname del servidor |
| HTTP -1, WiFi OK | Timeout muy corto | Aumentar timeout en `HTTPClient.setTimeout()` a 15000 ms (15s) |
| HTTP -1, logs vacíos | Request nunca llega al backend | Backend no está escuchando o firewall bloquea |
| HTTP 200 pero no hay datos en BD | Backend recibe pero no persiste | Ejecutar PASO 5 y 6 del checklist |
| HTTP 403 FORBIDDEN | Device no linked | Ejecutar PASO 2 del checklist |
| HTTP 401 UNAUTHORIZED | Bearer token inválido | Verificar apiSecret = base de datos |
| HTTP 404 NOT FOUND | Endpoint no existe | Verificar ruta: `/api/v2/sensors/reading` |

---

## 7️⃣ PLAN DE ACCIÓN INMEDIATO

### 7.1 Hoy (Debugging Local)
```
1. Deploy del backend con endpoints de debug ✅ (ya hecho)
2. Ejecutar PASO 1-3 del checklist
3. Si device está linked → Ejecutar PASO 5-6 (manual POST)
4. Ejecutar PASO 7 (debug endpoint) → Ver si datos llegan
5. Revisar PASO 8 (logs)
```

### 7.2 Si hay datos en BD (PASO 6 OK)
```
→ ¡Las lecturas SÍ llegan al backend!
→ Problema está en:
  - Frontend no polling correctamente
  - Dashboard stuck en "en espera"
  - Solución: Verificar useSensorData() hook en frontend
```

### 7.3 Si NO hay datos en BD (PASO 6 falla)
```
→ Las lecturas NO llegan al backend
→ Problema es HTTP -1 en ESP32
→ Investigar:
  1. SSL certificate issue (most likely)
  2. Timeout too short
  3. Firewall blocking HTTPS
  
→ Opciones:
  a) Aumentar timeout en ESP32: HTTPClient.setTimeout(15000)
  b) Cambiar a HTTP://  (temporary, not secure)
  c) Validar certificado en ESP32
  d) Usar `client.setInsecure(true)` (development only)
```

---

## 8️⃣ COMANDOS RÁPIDOS (Copiar/Pegar)

### Compilar backend
```bash
cd c:\Users\alexi\Desktop\BioSenseIoT\backend && mvn -DskipTests compile
```

### Ver últimas lecturas (backend local)
```bash
curl -s "http://localhost:8080/debug/latest-reading?macAddress=00:00:00:00:00:00&limit=10" | jq .
```

### Ver si device está linked
```bash
curl -s "http://localhost:8080/debug/device-lookup?macAddress=00:00:00:00:00:00" | jq .
```

### Query BD - Contar lecturas totales
```sql
SELECT COUNT(*) FROM sensor_readings;
```

### Query BD - Últimas 10 lecturas
```sql
SELECT * FROM sensor_readings 
WHERE device_id = 5 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 9️⃣ RESUMEN EJECUTIVO PARA PRÓXIMA SESIÓN

**Status Actual:**
- ✅ Backend compilado con debug endpoints
- ✅ Payload del ESP32 es correcto
- ❓ ¿Llegan los datos al backend?

**Próximo Paso:**
1. Ejecutar PASO 5 del checklist (manual POST test)
2. Revisar PASO 6 (datos en BD)
3. Si no hay datos → Investigar HTTP -1 (SSL/timeout)
4. Si hay datos → Dashboard está roto, no frontend

**Contacto Backend:**
- Endpoint POST: `/api/v2/sensors/reading`
- Debug: `GET /debug/latest-reading?macAddress=00:00:00:00:00:00`
- Logs: Buscar `[SENSORS]` en backend logs

---

**Última actualización:** 2026-04-21  
**Compilación Backend:** ✅ BUILD SUCCESS  
**Debug Endpoints:** ✅ ACTIVOS EN /debug/**
