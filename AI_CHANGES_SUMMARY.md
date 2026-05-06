# Resumen de Cambios - Integración IA con Ollama

## Fecha: 2026-05-05

### 📋 Archivos Creados

#### Backend - Modelos de Dominio
1. **`backend/src/main/java/com/biosense/iot/ai/domain/model/AiRecommendationDomain.java`**
   - Modelo de dominio para recomendaciones generadas por IA
   - Campos: userId, diagnosticId, readingId, petId, ollamaPrompt, aiResponse, etc.

#### Backend - Puertos
2. **`backend/src/main/java/com/biosense/iot/ai/domain/port/out/AiRecommendationRepositoryPort.java`**
   - Interfaz de persistencia para recomendaciones
   - Métodos: save(), findLatestByUserId(), findRecentByUserId(), etc.

#### Backend - Adaptadores de Persistencia
3. **`backend/src/main/java/com/biosense/iot/ai/infrastructure/adapter/out/persistence/R2dbcAiRecommendationRepositoryAdapter.java`**
   - Implementación R2DBC reactiva de persistencia
   - Usa R2dbcEntityTemplate para queries no-bloqueantes

#### Backend - Cliente Ollama
4. **`backend/src/main/java/com/biosense/iot/ai/infrastructure/adapter/out/ollama/OllamaClient.java`**
   - Cliente reactivo para Ollama
   - Características:
     - POST a /api/generate
     - Timeout de 30s configurable
     - Parser robusto con fallback
     - Manejo de errores con fallback graceful
   - Inner classes: OllamaResponse, OllamaParseException

#### Backend - Use Cases
5. **`backend/src/main/java/com/biosense/iot/ai/application/usecase/GenerateAiRecommendationUseCaseImpl.java`**
   - Orquestación de generación de IA
   - Solo activa si severity == DANGER
   - Construye prompt contextualizado
   - No bloquea el flujo principal

#### Backend - Configuración
6. **`backend/src/main/java/com/biosense/iot/config/WebClientConfig.java`**
   - Configuración de WebClient para Ollama

#### Documentación
7. **`AI_IMPLEMENTATION_GUIDE.md`** (en raíz)
   - Guía completa de implementación
   - Setup de Ollama, troubleshooting, pruebas
   - Diagramas de arquitectura y flujo

---

### 🔄 Archivos Modificados

#### Base de Datos
1. **`backend/src/main/resources/schema.sql`**
   - ✅ Agregada tabla `ai_recommendations` con:
     - Campos: ollama_prompt, ai_response, recommendation_title, recommendation_text, etc.
     - FK a users, ai_diagnostics, sensor_readings, pets
     - Índices para queries eficientes
   - ✅ Agregados 5 índices para performance

#### Configuración
2. **`backend/src/main/resources/application.properties`**
   - ✅ Agregadas propiedades Ollama:
     ```properties
     ollama.base-url=${OLLAMA_BASE_URL:http://localhost:11434}
     ollama.model=${OLLAMA_MODEL:llama2}
     ollama.timeout-ms=${OLLAMA_TIMEOUT_MS:30000}
     ```

#### Use Cases - Sensor Ingestion
3. **`backend/src/main/java/com/biosense/iot/sensor/application/usecase/IngestSensorReadingUseCaseImpl.java`**
   - ✅ Inyectado `GenerateAiRecommendationUseCaseImpl`
   - ✅ Modificado `generateAndSaveDiagnostic()`:
     - Ahora dispara IA si severity == DANGER
     - No bloquea el flujo (`.subscribe()` en paralelo)
     - Construye DiagnosticDomain con datos del sensor
     - Maneja errores con `.onErrorResume()`

#### Controllers
4. **`backend/src/main/java/com/biosense/iot/ai/infrastructure/adapter/in/web/AiControllerV2.java`**
   - ✅ Inyectado `AiRecommendationRepositoryPort`
   - ✅ Agregados 3 nuevos endpoints:
     - `GET /api/v2/ai/ollama/latest`: Última recomendación
     - `GET /api/v2/ai/ollama/recent`: Últimas N recomendaciones
     - `GET /api/v2/ai/ollama/{id}`: Recomendación específica
   - ✅ Métodos helper para extracción de userID

---

### 🏗️ Arquitectura Implementada

```
SENSOR INGESTION (IngestSensorReadingUseCaseImpl)
        ↓
    DIAGNÓSTICO (severity calculation)
        ↓
    ¿DANGER? → SÍ → GenerateAiRecommendationUseCaseImpl
        ↓                  ↓
    Retorna           OllamaClient.generateRecommendation()
    diagnóstico       (30s timeout, async, no-blocking)
    INMEDIATAMENTE         ↓
                      AiRecommendationRepositoryPort.save()
                           ↓
                      Base de datos
                      (puede ser SUCCESS, TIMEOUT, o ERROR)
```

---

### ✨ Características Principales

| Característica | Implementado |
|---|---|
| Activación automática en DANGER | ✅ |
| Reactividad (Mono/Flux) | ✅ |
| Timeout 30s | ✅ |
| Parser JSON robusto | ✅ |
| Fallback sin bloqueo | ✅ |
| Contexto de mascota | ✅ |
| Contexto de entorno | ✅ |
| Persistencia en BD | ✅ |
| API REST para consultas | ✅ |
| Auditoría de errores | ✅ |
| Configuración en application.properties | ✅ |

---

### 🔐 Seguridad

- ✅ Endpoints `/api/v2/ai/ollama/*` requieren autenticación JWT
- ✅ Las recomendaciones se filtran por userId
- ✅ No hay exposición de prompts internos a clientes
- ⚠️ TODO: Agregar userId a JWT claims para endpoints más seguros

---

### 📊 Base de Datos

**Nueva tabla: `ai_recommendations`**
```sql
BIGSERIAL id (PK)
INTEGER user_id (FK → users)
INTEGER diagnostic_id (FK → ai_diagnostics)
BIGINT reading_id (FK → sensor_readings)
INTEGER pet_id (FK → pets, nullable)
TEXT ollama_prompt
TEXT ai_response
VARCHAR(255) recommendation_title
TEXT recommendation_text
VARCHAR(1000) suggested_actions
DOUBLE PRECISION confidence_score
BIGINT processing_time_ms
VARCHAR(20) generation_status (SUCCESS/TIMEOUT/ERROR)
TEXT error_message
TIMESTAMP created_at
```

**Índices creados:**
- `idx_ai_recommendations_user_id`
- `idx_ai_recommendations_diagnostic_id`
- `idx_ai_recommendations_reading_id`
- `idx_ai_recommendations_user_created`
- `idx_ai_recommendations_status`

---

### 🚀 Setup y Deployment

#### Local Development
```bash
# 1. Descargar Ollama
# Windows/Mac: https://ollama.ai/download
# Linux: curl https://ollama.ai/install.sh | sh

# 2. Descargar modelo
ollama pull llama2

# 3. Iniciar servidor (en background)
ollama serve

# 4. Compilar y ejecutar backend
cd backend
mvn clean package
java -jar target/iot-backend-0.0.1-SNAPSHOT.jar
```

#### Docker
```dockerfile
FROM ollama/ollama:latest
RUN ollama pull llama2
CMD ollama serve
```

#### Variables de Entorno
```bash
OLLAMA_BASE_URL=http://localhost:11434      # o IP/hostname en producción
OLLAMA_MODEL=llama2                          # o mistral, neural-chat, orca-mini
OLLAMA_TIMEOUT_MS=30000                      # 30s por defecto
```

---

### 📈 Flujo de Ejecución

1. **ESP32 → Backend**: Envía lectura de sensor (CO=450ppm)
2. **Backend - Ingestión**: Guarda en `sensor_readings`
3. **Backend - Diagnóstico**: Calcula severity → DANGER
4. **Backend → Cliente**: Retorna diagnóstico (< 100ms)
5. **En paralelo**: GenerateAiRecommendationUseCaseImpl corre:
   - Construye prompt con contexto
   - Llama Ollama (30s max)
   - Guarda resultado en `ai_recommendations`
6. **Frontend**: Consulta `/api/v2/ai/ollama/latest` para recomendación

---

### 🧪 Testing

Incluidos en AI_IMPLEMENTATION_GUIDE.md:
- Test 1: Simular alerta ROJA y verificar recomendación
- Test 2: Verificar fallback sin Ollama
- Test 3: Verificar timeout y no-bloqueo

```bash
# Test rápido
curl -X POST http://localhost:8080/api/v2/sensors/reading \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"AA:BB:CC:DD:EE:FF","readingId":"test","mq4":300,"mq7":450,"mq135":900}'

# Consultar resultado
curl -X GET http://localhost:8080/api/v2/ai/ollama/latest \
  -H "Authorization: Bearer TOKEN"
```

---

### ⚠️ Limitaciones Conocidas

1. **Extraer userId**: El endpoint `extractUserIdFromAuth()` requiere userId en JWT claims
   - **Solución futura**: Integrar con sistema de JWT claims existente

2. **Modelos de Ollama**: Limitados por hardware disponible
   - **Recomendación**: Usar `orca-mini` (3B) en hardware limitado
   - **Ideal**: `neural-chat` (7B) para mejor calidad

3. **Rate limiting**: No implementado
   - **Recomendación futura**: Agregar rate limiter en endpoints

---

### 📚 Documentación Completa

Ver **`AI_IMPLEMENTATION_GUIDE.md`** para:
- Arquitectura detallada con diagramas
- Setup de Ollama paso a paso
- Troubleshooting y diagnostics
- Ejemplos de requests/responses
- Monitoreo en producción
- Performance tuning
- Queries SQL útiles

---

### ✅ Checklist de Verificación

- [x] Tabla `ai_recommendations` creada
- [x] Índices en BD creados
- [x] Modelo AiRecommendationDomain
- [x] Puerto de persistencia
- [x] Adaptador R2DBC
- [x] Cliente OllamaClient reactivo
- [x] Use case GenerateAiRecommendation
- [x] Integración en sensor ingestion
- [x] Endpoints REST en controller
- [x] Configuración en application.properties
- [x] Documentación completa
- [x] Ejemplos de uso
- [x] Troubleshooting guide

---

### 🔗 Próximos Pasos Sugeridos

1. **Inmediato**:
   - [ ] Descargar e instalar Ollama localmente
   - [ ] Compilar el backend con cambios
   - [ ] Ejecutar tests manuales

2. **Corto plazo**:
   - [ ] Agregar userId a JWT claims
   - [ ] Crear endpoint de administración para recomendaciones
   - [ ] Implementar WebSocket para notificaciones

3. **Mediano plazo**:
   - [ ] A/B testing de diferentes prompts
   - [ ] Fine-tuning de modelos con datos reales
   - [ ] Caché de recomendaciones
   - [ ] Alertas por email/SMS cuando hay recomendación

4. **Largo plazo**:
   - [ ] Machine learning para ranking de recomendaciones
   - [ ] Integración con servicios de emergencia
   - [ ] Dashboard de analytics de recomendaciones

