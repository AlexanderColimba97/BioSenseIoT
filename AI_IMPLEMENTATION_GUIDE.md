# Integración de IA con Ollama - Guía de Implementación

## Descripción General

Se ha implementado un sistema reactivo de recomendaciones de IA basado en **Ollama** que se activa cuando se detecta una alerta de seguridad ROJA (contaminación de aire perjudicial).

### Características Principales
- ✅ **Reactivo y No-Bloqueante**: Usa Mono<T> y Flux<T>, sin `.block()`
- ✅ **Tolerancia a Fallos**: Si Ollama falla o timeout, el diagnóstico se entrega igual
- ✅ **Timeout de 30s**: Previene bloqueos indefinidos
- ✅ **Parser Robusto**: Limpia markdown JSON, maneja errores con fallback
- ✅ **Contextualizado**: Considera mascota, entorno, y lecturas de sensor

---

## Arquitectura

### Componentes Implementados

#### 1. **Modelo de Dominio** (`AiRecommendationDomain`)
```
- userId: ID del usuario
- diagnosticId: ID del diagnóstico que dispara la IA
- readingId: ID de la lectura de sensor
- petId: ID de la mascota (opcional)
- ollamaPrompt: Prompt enviado a Ollama
- aiResponse: Respuesta cruda de Ollama
- recommendationTitle: Título generado
- recommendationText: Texto de recomendación
- suggestedActions: JSON con acciones sugeridas
- processingTimeMs: Tiempo de procesamiento
- generationStatus: SUCCESS | TIMEOUT | ERROR
- errorMessage: Mensaje de error si aplica
```

#### 2. **Puerto de Persistencia** (`AiRecommendationRepositoryPort`)
- `save(AiRecommendationDomain)`: Guarda recomendación
- `findLatestByUserId(userId)`: Obtiene la más reciente
- `findRecentByUserId(userId, limit)`: Obtiene últimas N

#### 3. **Cliente Ollama** (`OllamaClient`)
```
Características:
- POST /api/generate a Ollama
- Timeout configurable (30s por defecto)
- Limpieza de markdown code blocks
- Parsing JSON robusto
- Manejo de errores con fallback
```

#### 4. **Use Case** (`GenerateAiRecommendationUseCaseImpl`)
```
Lógica:
1. Solo genera si severity == DANGER
2. Construye prompt contextualizado
3. Llama a Ollama reactivamente
4. Guarda resultado (éxito o error)
5. No bloquea el flujo principal
```

#### 5. **Integración en Sensor** (`IngestSensorReadingUseCaseImpl`)
```
Flujo:
1. Se ingesta lectura de sensor
2. Se genera diagnóstico (SAFE/WARNING/DANGER)
3. Si DANGER → dispara generación de IA
4. IA corre en paralelo (.subscribe() sin await)
5. Diagnóstico se retorna inmediatamente
```

#### 6. **Endpoints REST** (`AiControllerV2`)
- `GET /api/v2/ai/ollama/latest`: Última recomendación
- `GET /api/v2/ai/ollama/recent?limit=10`: Últimas N recomendaciones
- `GET /api/v2/ai/ollama/{id}`: Recomendación específica

---

## Tabla de Base de Datos

### `ai_recommendations`
```sql
CREATE TABLE ai_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    diagnostic_id INTEGER NOT NULL,
    reading_id BIGINT NOT NULL,
    pet_id INTEGER,
    ollama_prompt TEXT,
    ai_response TEXT,
    recommendation_title VARCHAR(255),
    recommendation_text TEXT,
    suggested_actions VARCHAR(1000),
    confidence_score DOUBLE PRECISION,
    processing_time_ms BIGINT,
    generation_status VARCHAR(20),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

**Índices:**
- `idx_ai_recommendations_user_id`
- `idx_ai_recommendations_diagnostic_id`
- `idx_ai_recommendations_reading_id`
- `idx_ai_recommendations_user_created`
- `idx_ai_recommendations_status`

---

## Configuración

### application.properties

```properties
# Ollama Configuration
ollama.base-url=${OLLAMA_BASE_URL:http://localhost:11434}
ollama.model=${OLLAMA_MODEL:llama2}
ollama.timeout-ms=${OLLAMA_TIMEOUT_MS:30000}
```

### Variables de Entorno

```bash
# Para desarrollo local:
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_MODEL=llama2
export OLLAMA_TIMEOUT_MS=30000

# Para producción (Railway, Docker, etc):
# Configurar según tu deployment
```

### Setup de Ollama Local

```bash
# 1. Instalar Ollama
# Windows/Mac: https://ollama.ai/download
# Linux: curl https://ollama.ai/install.sh | sh

# 2. Descargar modelo (ej: llama2)
ollama pull llama2

# 3. Ejecutar servidor (en background)
ollama serve

# El servidor escuchará en http://localhost:11434
```

---

## Flujo de Ejecución

### Scenario: Usuario registra mascota y recibe alerta ROJA

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ESP32 envia lectura peligrosa: CO=450ppm                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. IngestSensorReadingUseCaseImpl                           │
│    - Guarda lectura                                        │
│    - Calcula riesgo → DANGER                               │
│    - Retorna lectura INMEDIATAMENTE                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │ (Sin esperar)       │
            ▼                     ▼
    ┌──────────────────┐  ┌────────────────────────┐
    │ App recibe:      │  │ En paralelo:           │
    │ - Lectura        │  │ GenerateAiRecommend... │
    │ - Diagnóstico    │  │ - Construye prompt     │
    │ (DANGER)         │  │ - Llama a Ollama (30s) │
    │ - User notificado│  │ - Guarda en BD         │
    └──────────────────┘  └────────────────────────┘
                                  │
                                  ▼
                          ┌───────────────────┐
                          │ Recomendación     │
                          │ guardada en BD    │
                          │ (puede ser ERROR) │
                          └───────────────────┘
```

### Timeout Handling

```
Ollama no responde dentro de 30s
         │
         ▼
    OllamaClient.generateRecommendation()
         │
         ├─ timeout()
         │
         └─ onErrorResume() retorna:
            status: TIMEOUT
            text: "El sistema está procesando..."
         │
         ▼
    GenerateAiRecommendationUseCaseImpl guarda
    con status=TIMEOUT para auditoría
         │
         ▼
    App puede reintentar más tarde
```

---

## Response Examples

### GET /api/v2/ai/ollama/latest

```json
{
  "id": 12345,
  "title": "Ventilación Inmediata Requerida",
  "text": "Se detectó monóxido de carbono en niveles peligrosos...",
  "actions": "[\"1. Abra todas las ventanas\", \"2. Saque a la mascota al aire libre\", ...]",
  "confidence": 0.85,
  "processingTimeMs": 2340,
  "status": "SUCCESS",
  "createdAt": "2026-05-05T14:32:00Z"
}
```

### GET /api/v2/ai/ollama/recent?limit=5

```json
{
  "count": 3,
  "recommendations": [
    {
      "id": 12345,
      "title": "Ventilación Inmediata",
      "text": "...",
      "confidence": 0.85,
      "status": "SUCCESS",
      "createdAt": "2026-05-05T14:32:00Z"
    },
    {
      "id": 12344,
      "title": "Revisar Calentador",
      "text": "...",
      "confidence": 0.75,
      "status": "SUCCESS",
      "createdAt": "2026-05-05T12:15:00Z"
    }
  ]
}
```

---

## Modelos Soportados (Ollama)

### Recomendados para BioSenseIoT

| Modelo | Tamaño | Velocidad | Calidad | Comando |
|--------|--------|-----------|---------|---------|
| llama2 | 7B | Rápido | Buena | `ollama pull llama2` |
| mistral | 7B | Muy rápido | Buena | `ollama pull mistral` |
| neural-chat | 7B | Rápido | Excelente | `ollama pull neural-chat` |
| orca-mini | 3B | Ultra rápido | Aceptable | `ollama pull orca-mini` |

**Por defecto:** `llama2`

Para cambiar:
```bash
export OLLAMA_MODEL=mistral
```

---

## Diagrama de Secuencia (PlantUML)

```
ESP32 -> Backend: POST /api/v2/sensors/reading {mq7: 450}
activate Backend

Backend -> SensorRepo: save(reading)
Backend -> DiagnosticService: generate() → DANGER
Backend -> App: 200 OK (reading + diagnostic)

par
  Backend -> OllamaClient: generateRecommendation(prompt)
  activate OllamaClient
  OllamaClient -> Ollama: POST /api/generate
  activate Ollama
  Ollama -> Ollama: Process (2-5s)
  Ollama --> OllamaClient: JSON response
  deactivate Ollama
  OllamaClient -> OllamaClient: Parse + Clean
  OllamaClient --> AiRecommendationRepo: save()
  deactivate OllamaClient
end

deactivate Backend
```

---

## Troubleshooting

### Error: "Connection refused" a Ollama

```
Verificar:
1. ¿Ollama está corriendo?
   $ ollama serve
   
2. ¿Puerto 11434 está abierto?
   $ curl http://localhost:11434/api/tags
   
3. ¿OLLAMA_BASE_URL correcto?
   export OLLAMA_BASE_URL=http://localhost:11434
```

### Error: "Timeout después de 30000ms"

```
Posibles causas:
1. Ollama está sobrecargado
2. Modelo muy grande (usa orca-mini en lugar de llama2)
3. Hardware insuficiente

Soluciones:
- Aumentar timeout en application.properties
- Usar modelo más pequeño
- Agregar más RAM
```

### Error: "No se puede parsear JSON"

```
El cliente tiene fallback:
- Si el JSON es inválido → usa texto completo
- Si no hay {} en respuesta → retorna como texto
- Logs muestran advertencia pero continúa

Revisar logs:
grep "No se pudo parsear JSON" backend.log
```

### Recomendaciones vacías

```
Causas:
1. No hay lecturas con severity=DANGER
2. Ollama retorna status=TIMEOUT o ERROR
3. Usuario no tiene mascota registrada

Verificar:
- SELECT * FROM ai_recommendations 
  WHERE user_id=X AND generation_status='ERROR';
```

---

## Pruebas Manuales

### Test 1: Simular alerta ROJA

```bash
# 1. Crear usuario y dispositivo (ver QUICK_START.md)

# 2. Enviar lectura crítica
curl -X POST http://localhost:8080/api/v2/sensors/reading \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "readingId": "test-001",
    "mq4": 300,
    "mq7": 450,
    "mq135": 900
  }'

# 3. Esperar 5-10 segundos (Ollama procesa)

# 4. Obtener recomendación
curl -X GET http://localhost:8080/api/v2/ai/ollama/latest \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Verificar sin Ollama (Fallback)

```bash
# Desconectar Ollama y enviar lectura ROJA
# El sistema debe:
# 1. Retornar diagnóstico normalmente
# 2. Guardar recomendación con status=ERROR
# 3. Log: "Error en OllamaClient..."
```

### Test 3: Timeout de 30s

```bash
# 1. Ralentizar Ollama deliberadamente
# 2. Enviar lectura ROJA
# 3. Medir tiempo de respuesta:
#    - Debe ser < 1s (retorna antes de Ollama)
#    - IA se procesa en background
# 4. Ver recomendación con status=TIMEOUT
```

---

## Monitoreo en Producción

### Logs a Revisar

```bash
# Éxitos
grep "Recomendación IA guardada exitosamente" backend.log

# Errores
grep "Error generando recomendación de IA" backend.log
grep "Error en OllamaClient" backend.log

# Timeouts
grep "Timeout en Ollama" backend.log

# Parsing issues
grep "No se pudo parsear JSON" backend.log
```

### Métricas Recomendadas

1. **Latencia de generación**: `processingTimeMs` promedio
2. **Tasa de éxito**: `COUNT(*) WHERE status='SUCCESS'`
3. **Tasa de timeout**: `COUNT(*) WHERE status='TIMEOUT'`
4. **Tasa de error**: `COUNT(*) WHERE status='ERROR'`
5. **Tiempo de respuesta de API**: < 1s

### Queries SQL

```sql
-- Últimas recomendaciones
SELECT id, user_id, status, processing_time_ms, created_at
FROM ai_recommendations
ORDER BY created_at DESC
LIMIT 10;

-- Estadísticas de rendimiento
SELECT generation_status, COUNT(*) as count,
       AVG(processing_time_ms) as avg_ms,
       MAX(processing_time_ms) as max_ms
FROM ai_recommendations
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY generation_status;
```

---

## Performance Tuning

### Para Agilizar Respuestas

1. **Reducir timeout de Ollama** (si es confiable)
   ```properties
   ollama.timeout-ms=15000
   ```

2. **Usar modelo más pequeño**
   ```properties
   ollama.model=orca-mini
   ```

3. **Agregar índices en PostgreSQL**
   ```sql
   CREATE INDEX idx_ai_recommendations_user_recent 
   ON ai_recommendations(user_id, created_at DESC);
   ```

### Para Mayor Confiabilidad

1. **Aumentar timeout**
   ```properties
   ollama.timeout-ms=45000
   ```

2. **Usar modelo con mejor calidad**
   ```properties
   ollama.model=neural-chat
   ```

3. **Pool de conexiones más grande**
   ```properties
   spring.r2dbc.pool.max-size=30
   ```

---

## Próximas Mejoras

- [ ] Agregar userId a JWT claims para endpoints seguros
- [ ] WebSocket para notificaciones de recomendación en tiempo real
- [ ] Caché de recomendaciones por tipo de alerta
- [ ] A/B testing de diferentes prompts
- [ ] Fine-tuning de modelos con datos históricos
- [ ] Integración con alertas por SMS/email

---

## Referencias

- [Ollama Official](https://ollama.ai)
- [Spring WebFlux Reactive](https://spring.io/projects/spring-webflux)
- [Project Reactor](https://projectreactor.io)
- [R2DBC](https://r2dbc.io)

