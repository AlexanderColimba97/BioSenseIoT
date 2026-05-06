# Guía Rápida - IA Ollama en BioSenseIoT

## Inicio en 5 minutos

### 1. Instalar Ollama

**Windows/Mac:**
- Descargar desde https://ollama.ai/download
- Ejecutar instalador

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

### 2. Descargar modelo

```bash
# Opción A: llama2 (recomendado balance)
ollama pull llama2

# Opción B: mistral (más rápido)
ollama pull mistral

# Opción C: orca-mini (muy rápido, menos preciso)
ollama pull orca-mini
```

### 3. Ejecutar servidor Ollama

```bash
# En una terminal separada, dejar corriendo:
ollama serve

# Debe mostrar:
# Listening on 127.0.0.1:11434
```

### 4. Compilar backend

```bash
cd backend
mvn clean package -DskipTests
```

### 5. Ejecutar backend

```bash
# Con configuración por defecto:
java -jar target/iot-backend-0.0.1-SNAPSHOT.jar

# O con variables de entorno:
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_MODEL=llama2
export OLLAMA_TIMEOUT_MS=30000
java -jar target/iot-backend-0.0.1-SNAPSHOT.jar
```

---

## Test Rápido

### 1. Registrar usuario
```bash
curl -X POST http://localhost:8080/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Guardar el token JWT en $TOKEN
```

### 2. Registrar dispositivo
```bash
curl -X POST http://localhost:8080/api/v2/devices/link \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"AA:BB:CC:DD:EE:FF","name":"Sensor Sala"}'
```

### 3. Registrar mascota
```bash
curl -X POST http://localhost:8080/api/v2/profiles/pets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Max",
    "species":"DOG",
    "breed":"Golden Retriever",
    "ageYears":3,
    "weightKg":30,
    "sensitivityLevel":"HIGH"
  }'
```

### 4. **ACTIVAR ALERTA ROJA** (Simular peligro)
```bash
curl -X POST http://localhost:8080/api/v2/sensors/reading \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress":"AA:BB:CC:DD:EE:FF",
    "readingId":"alerta-001",
    "mq4":300,
    "mq7":450,
    "mq135":900
  }'

# Respuesta: diagnóstico con severity=DANGER
# En background: IA está procesando...
```

### 5. **ESPERAR 5-10 SEGUNDOS**

Ollama está generando la recomendación. Logs mostrarán:
```
INFO: Iniciando generación de recomendación con Ollama. Modelo: llama2
...
INFO: Recomendación IA guardada exitosamente. ID: 12345, Status: SUCCESS
```

### 6. Obtener recomendación
```bash
curl -X GET http://localhost:8080/api/v2/ai/ollama/latest \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "id": 12345,
  "title": "Ventilación Inmediata Requerida",
  "text": "Se detectó monóxido de carbono en niveles críticos...",
  "actions": "[\"1. Abra ventanas\", \"2. Saque mascota al aire libre\", ...]",
  "confidence": 0.85,
  "processingTimeMs": 3421,
  "status": "SUCCESS",
  "createdAt": "2026-05-05T14:32:00Z"
}
```

---

## Pasos Problemáticos

### Ollama no responde
```bash
# Verificar que está corriendo:
curl http://localhost:11434/api/tags

# Si error, iniciar en nueva terminal:
ollama serve

# Si aún falla, verificar puerto:
netstat -an | grep 11434
```

### Timeout (> 30s sin respuesta)
```bash
# El backend retorna diagnóstico igual
# Pero recomendación guardada con status=TIMEOUT

# Soluciones:
# 1. Usar modelo más pequeño:
export OLLAMA_MODEL=orca-mini

# 2. Aumentar timeout en application.properties:
# ollama.timeout-ms=45000
```

### Recomendación vacía o con ERROR
```bash
# Ver logs:
tail -f backend.log | grep "AI"

# Verificar BD:
SELECT * FROM ai_recommendations 
WHERE user_id=YOUR_USER_ID 
ORDER BY created_at DESC LIMIT 1;

# Si status=ERROR, ver error_message
```

---

## Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v2/ai/ollama/latest` | Última recomendación |
| GET | `/api/v2/ai/ollama/recent?limit=10` | Últimas 10 |
| GET | `/api/v2/ai/ollama/{id}` | Recomendación específica |

---

## Modelos Disponibles

```bash
# Listar modelos disponibles
ollama list

# Cambiar modelo
export OLLAMA_MODEL=mistral
```

| Modelo | Velocidad | Calidad | Tamaño |
|--------|-----------|---------|--------|
| orca-mini | ⚡⚡⚡ | ⭐⭐ | 3GB |
| mistral | ⚡⚡ | ⭐⭐⭐ | 7GB |
| llama2 | ⚡ | ⭐⭐⭐⭐ | 7GB |
| neural-chat | ⚡ | ⭐⭐⭐⭐⭐ | 7GB |

---

## Debugging

### Ver logs en tiempo real
```bash
# Terminal 1: Backend
java -jar target/iot-backend-0.0.1-SNAPSHOT.jar 2>&1 | grep -i "ai\|ollama"

# Terminal 2: Ollama
ollama serve

# Terminal 3: Test
curl ... (ver arriba)
```

### Consultas BD útiles
```sql
-- Ver últimas recomendaciones
SELECT id, user_id, status, processing_time_ms, created_at
FROM ai_recommendations
ORDER BY created_at DESC LIMIT 5;

-- Ver errores
SELECT id, user_id, generation_status, error_message, created_at
FROM ai_recommendations
WHERE generation_status != 'SUCCESS'
ORDER BY created_at DESC;

-- Ver tiempo promedio de procesamiento
SELECT AVG(processing_time_ms) as avg_ms, 
       MIN(processing_time_ms) as min_ms,
       MAX(processing_time_ms) as max_ms
FROM ai_recommendations
WHERE generation_status = 'SUCCESS';
```

---

## Demo Completa (Script)

```bash
#!/bin/bash

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== BioSenseIoT IA Demo ===${NC}"

# 1. Login
echo -e "${YELLOW}1. Registrando usuario...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@biosense.com","password":"demo123"}')
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}Token: ${TOKEN:0:20}...${NC}"

# 2. Link device
echo -e "${YELLOW}2. Vinculando dispositivo...${NC}"
curl -s -X POST http://localhost:8080/api/v2/devices/link \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"AA:BB:CC:DD:EE:FF","name":"Sensor Demo"}' > /dev/null
echo -e "${GREEN}Dispositivo vinculado${NC}"

# 3. Register pet
echo -e "${YELLOW}3. Registrando mascota...${NC}"
curl -s -X POST http://localhost:8080/api/v2/profiles/pets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Max","species":"DOG","breed":"Labrador","ageYears":5,"weightKg":35,"sensitivityLevel":"HIGH"}' > /dev/null
echo -e "${GREEN}Mascota registrada${NC}"

# 4. Send danger reading
echo -e "${YELLOW}4. Enviando lectura crítica (IA se activará)...${NC}"
curl -s -X POST http://localhost:8080/api/v2/sensors/reading \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress":"AA:BB:CC:DD:EE:FF",
    "readingId":"demo-'$(date +%s)'",
    "mq4":300,
    "mq7":450,
    "mq135":900
  }' > /dev/null
echo -e "${GREEN}Lectura enviada (severity=DANGER)${NC}"

# 5. Wait for AI
echo -e "${YELLOW}5. Esperando procesamiento de IA (hasta 10 segundos)...${NC}"
for i in {1..10}; do
  RESULT=$(curl -s -X GET http://localhost:8080/api/v2/ai/ollama/latest \
    -H "Authorization: Bearer $TOKEN")
  
  if echo $RESULT | grep -q "SUCCESS"; then
    echo -e "${GREEN}✓ Recomendación generada exitosamente!${NC}"
    echo $RESULT | jq .
    break
  fi
  
  echo -n "."
  sleep 1
done

echo -e "${GREEN}=== Demo completada ===${NC}"
```

**Guardar como `demo-ai.sh` y ejecutar:**
```bash
chmod +x demo-ai.sh
./demo-ai.sh
```

---

## Próximos Pasos

1. ✅ Instalar Ollama localmente
2. ✅ Compilar backend
3. ✅ Ejecutar tests manuales
4. 📖 Leer `AI_IMPLEMENTATION_GUIDE.md` para detalles
5. 🚀 Desplegar en producción

---

## Soporte Rápido

| Problema | Solución |
|----------|----------|
| "Connection refused" | Verificar `ollama serve` corriendo |
| Timeout | Usar `orca-mini` en lugar de `llama2` |
| JSON parsing error | Ver logs, puede ser fallback a texto |
| Recomendación vacía | Enviar lectura con severity=DANGER |

