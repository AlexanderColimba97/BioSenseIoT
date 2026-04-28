# Backend API Summary - BioSenseIoT

## Estructura de Controladores

El backend utiliza arquitectura **Hexagonal (Ports & Adapters)** con los siguientes controladores:

---

## 1. AUTH CONTROLLER - `/api/v2/auth`

**Archivo:** [AuthControllerV2.java](backend/src/main/java/com/biosense/iot/auth/infrastructure/adapter/in/web/AuthControllerV2.java)

**Path Base:** `@RequestMapping("/api/v2/auth")`

| Método | Endpoint | Parámetros | Respuesta | Descripción |
|--------|----------|-----------|----------|------------|
| **POST** | `/google` | `{ "idToken": "string" }` | `AuthResponse` | Autenticar con Google usando ID Token |
| **POST** | `/login` | `{ "email": "string", "password": "string" }` | `AuthResponse` | Login con email y contraseña |
| **POST** | `/register` | `{ "email": "string", "password": "string", "fullName": "string" }` | `AuthResponse` | Registrar nuevo usuario |
| **POST** | `/refresh` | `{ "refreshToken": "string", "accessToken": "string" }` | `AuthResponse` | Refrescar tokens JWT |

**DTO Respuesta:** `AuthResponse`
- Contiene tokens JWT (access y refresh)
- Usuario autenticado

**Use Cases (Puertos):**
- `AuthenticateWithGoogleUseCase`
- `LoginUseCase`
- `RegisterUseCase`

---

## 2. DEVICE CONTROLLER - `/api/v2/devices`

**Archivo:** [DeviceControllerV2.java](backend/src/main/java/com/biosense/iot/device/infrastructure/adapter/in/web/DeviceControllerV2.java)

**Path Base:** `@RequestMapping("/api/v2/devices")`

| Método | Endpoint | Parámetros | Respuesta | Descripción |
|--------|----------|-----------|----------|------------|
| **POST** | `/link` | `LinkDeviceRequest { macAddress, deviceName }` | `LinkDeviceResponse` | Vincular dispositivo a usuario (requiere Auth) |
| **GET** | `/my-devices` | — | `Flux<DeviceResponseDto>` | Obtener todos los dispositivos del usuario (requiere Auth) |
| **GET** | `/{deviceId}/readings` | `deviceId (path)`, `limit=100 (query)` | `Flux<SensorReadingResponseDto>` | Obtener lecturas de un dispositivo (requiere Auth) |
| **DELETE** | `/{deviceId}` | `deviceId (path)` | `LinkDeviceResponse` | Desvincular dispositivo del usuario (requiere Auth) |

**DTOs:**

**LinkDeviceRequest:**
```json
{
  "macAddress": "XX:XX:XX:XX:XX:XX",
  "deviceName": "Sensor de Sala"
}
```

**LinkDeviceResponse:**
```json
{
  "status": "success",
  "deviceId": 5,
  "macAddress": "XX:XX:XX:XX:XX:XX",
  "name": "Sensor de Sala",
  "apiSecret": "secret_key"
}
```

**DeviceResponseDto:**
```json
{
  "id": 5,
  "name": "Sensor de Sala",
  "macAddress": "XX:XX:XX:XX:XX:XX"
}
```

**SensorReadingResponseDto:**
```json
{
  "id": 12345,
  "mq4": 42.88,
  "mq7": 74.83,
  "mq135": 150.25,
  "timestamp": "2026-04-21T14:25:30Z",
  "airQualityState": "WARNING"
}
```

**Domain Model:** `DeviceDomain`
- `id: Integer`
- `macAddress: String`
- `name: String`
- `userId: Integer`
- `apiSecret: String`

**Use Cases (Puertos):**
- `LinkDeviceUseCase` — vincular/desvincular dispositivo
- `GetUserDevicesUseCase` — obtener dispositivos del usuario

---

## 3. SENSOR CONTROLLER - `/api/v2/sensors`

**Archivo:** [SensorControllerV2.java](backend/src/main/java/com/biosense/iot/sensor/infrastructure/adapter/in/web/SensorControllerV2.java)

**Path Base:** `@RequestMapping("/api/v2/sensors")`

| Método | Endpoint | Parámetros | Respuesta | Descripción |
|--------|----------|-----------|----------|------------|
| **POST** | `/reading` | `SensorReadingRequest { macAddress, readingId?, mq4, mq7, mq135, timestamp? }`, Header: `Authorization: Bearer <apiKey>` (opcional) | `{ "status": "success", "id": ..., "airQualityState": "..." }` | Ingestar lectura de sensor desde ESP32 |

**SensorReadingRequest:**
```json
{
  "macAddress": "XX:XX:XX:XX:XX:XX",
  "readingId": "XX:XX:XX:XX:XX:XX-9-712857d-75127",
  "mq4": 42.88,
  "mq7": 74.83,
  "mq135": 150.25,
  "timestamp": 1713696330000
}
```

**Respuesta Éxito:**
```json
{
  "status": "success",
  "id": 12345,
  "airQualityState": "WARNING"
}
```

**Domain Model:** `SensorReadingDomain`
- `id: Long`
- `deviceId: Integer`
- `readingId: String`
- `mq4: Double` (Metano)
- `mq7: Double` (Monóxido de Carbono)
- `mq135: Double` (Calidad del Aire)
- `timestamp: Instant`
- `airQualityState: Enum` (CLEAN, WARNING, DANGER)

**Lógica de Estado:**
- **DANGER:** si mq7 > 200 O mq135 > 400
- **WARNING:** si mq7 > 100 O mq135 > 200
- **CLEAN:** en otro caso

**Use Cases (Puertos):**
- `IngestSensorReadingUseCase` — procesar lectura de sensor

---

## 4. DIAGNOSTIC CONTROLLER - `/api/v2/diagnostics`

**Archivo:** [DiagnosticControllerV2.java](backend/src/main/java/com/biosense/iot/diagnostic/infrastructure/adapter/in/web/DiagnosticControllerV2.java)

**Path Base:** `@RequestMapping("/api/v2/diagnostics")`

| Método | Endpoint | Parámetros | Respuesta | Descripción |
|--------|----------|-----------|----------|------------|
| **GET** | `/latest` | Header: `Authorization: Bearer <token>` (requerido) | `DiagnosticDomain` | Obtener último diagnóstico del usuario (requiere Auth) |

**Respuesta:** `DiagnosticDomain`
```json
{
  "diagnosticText": "Niveles moderados de CO detectados",
  "severity": "MODERATE",
  "riskLevel": "MEDIUM",
  "confidence": 0.85,
  "affectedPet": "Perro - Raza: Labrador",
  "environmentContext": "Sala de estar - Ventilación normal",
  "recommendation": "Aumentar ventilación cada 2 horas",
  "timestamp": "2026-04-21T14:25:30Z",
  "mq4": 42.88,
  "mq7": 74.83,
  "mq135": 150.25
}
```

**Domain Model:** `DiagnosticDomain`
- `diagnosticText: String`
- `severity: String`
- `riskLevel: String`
- `confidence: Double`
- `affectedPet: String`
- `environmentContext: String`
- `recommendation: String`
- `timestamp: Instant`
- `mq4: Double`
- `mq7: Double`
- `mq135: Double`

**Use Cases (Puertos):**
- `GetLatestDiagnosticUseCase` — obtener diagnóstico más reciente

---

## 5. PROFILE/CONTEXT CONTROLLER - `/api/v2/profile`

**Archivo:** [ProfileContextControllerV2.java](backend/src/main/java/com/biosense/iot/pet/infrastructure/adapter/in/web/ProfileContextControllerV2.java)

**Path Base:** `@RequestMapping("/api/v2/profile")`

| Método | Endpoint | Parámetros | Respuesta | Descripción |
|--------|----------|-----------|----------|------------|
| **GET** | `/context` | Authentication (requerida) | `UserContextProfileDomain` | Obtener contexto completo del usuario (mascotas + ambiente) |
| **POST** | `/pets` | `PetRequest { id?, name, species, breed, ageYears, weightKg, sensitivityLevel, respiratoryRisk, activityLevel, vulnerabilities }`, Auth | `PetProfileDomain` | Crear/actualizar mascota |
| **DELETE** | `/pets/{petId}` | `petId (path)`, Auth | `204 No Content` | Eliminar mascota |
| **PUT** | `/environment` | `EnvironmentRequest { id?, profileName, spaceType, areaType, ventilationLevel, urbanContext, notes }`, Auth | `EnvironmentProfileDomain` | Crear/actualizar perfil de ambiente |

**DTOs:**

**UserContextProfileDomain (Respuesta de /context):**
```json
{
  "email": "user@example.com",
  "pets": [
    {
      "id": 1,
      "userId": 5,
      "name": "Max",
      "species": "DOG",
      "breed": "Labrador",
      "ageYears": 5,
      "weightKg": 30.5,
      "sensitivityLevel": "HIGH",
      "respiratoryRisk": "NORMAL",
      "activityLevel": "HIGH",
      "healthRiskLevel": "LOW",
      "vulnerabilities": "Asma leve",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-04-21T14:25:30Z"
    }
  ],
  "environment": {
    "id": 1,
    "profileName": "Casa Principal",
    "spaceType": "HOUSE",
    "areaType": "MIXED_USE",
    "ventilationLevel": "NORMAL",
    "urbanContext": "SUBURBAN",
    "notes": "Casa con jardín, cerca de industria",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-04-21T14:25:30Z"
  }
}
```

**PetProfileDomain:**
- `id: Integer`
- `userId: Integer`
- `name: String`
- `species: String` (DOG, CAT, BIRD, RABBIT, etc.)
- `breed: String`
- `ageYears: Integer`
- `weightKg: Double`
- `sensitivityLevel: String` (LOW, MEDIUM, HIGH)
- `respiratoryRisk: String` (NORMAL, MILD, SEVERE)
- `activityLevel: String` (LOW, MEDIUM, HIGH)
- `healthRiskLevel: String`
- `vulnerabilities: String`
- `createdAt: Instant`
- `updatedAt: Instant`

**EnvironmentProfileDomain:**
- `id: Integer`
- `profileName: String`
- `spaceType: String` (HOUSE, APARTMENT, OFFICE, etc.)
- `areaType: String` (RESIDENTIAL, COMMERCIAL, MIXED_USE, etc.)
- `ventilationLevel: String` (POOR, NORMAL, GOOD)
- `urbanContext: String` (URBAN, SUBURBAN, RURAL)
- `notes: String`
- `createdAt: Instant`
- `updatedAt: Instant`

**Use Cases (Puertos):**
- `ManageProfileContextUseCase` — gestionar contexto del usuario

---

## 6. DEBUG SENSOR CONTROLLER - `/debug`

**Archivo:** [DebugSensorController.java](backend/src/main/java/com/biosense/iot/sensor/infrastructure/adapter/in/web/DebugSensorController.java)

⚠️ **SOLO PARA DEBUGGING - DESACTIVAR EN PRODUCCIÓN**

**Path Base:** `@RequestMapping("/debug")`

| Método | Endpoint | Parámetros | Respuesta | Descripción |
|--------|----------|-----------|----------|------------|
| **GET** | `/latest-reading` | `macAddress=XX:XX:XX:XX:XX:XX`, `limit=10 (default)` | `{ "status", "macAddress", "deviceId", "readingsCount", "readings": [...] }` | Obtener últimas N lecturas de un dispositivo |
| **GET** | `/device-lookup` | `macAddress=XX:XX:XX:XX:XX:XX` | `{ "macAddress", "status", "deviceId", "userCount" }` | Lookup MAC → Device ID |
| **GET** | `/sensor-stats` | — | `{ "status": "ok", "message": "..." }` | Estadísticas generales (informacional) |
| **GET** | `/test-endpoint` | — | Mensaje de prueba | Endpoint de prueba |

---

## Puertos (Abstracción de Negocio)

### Puertos de Entrada (Use Cases / In Ports)
Definen operaciones de negocio:

| Módulo | Puerto | Responsabilidad |
|--------|--------|-----------------|
| **Auth** | `AuthenticateWithGoogleUseCase` | Autenticar con Google |
| **Auth** | `LoginUseCase` | Login email/password |
| **Auth** | `RegisterUseCase` | Registro de nuevo usuario |
| **Device** | `LinkDeviceUseCase` | Vincular/desvincular dispositivo |
| **Device** | `GetUserDevicesUseCase` | Obtener dispositivos del usuario |
| **Sensor** | `IngestSensorReadingUseCase` | Ingestar lectura de sensor |
| **Sensor** | `GetDeviceReadingsUseCase` | Obtener lecturas de dispositivo |
| **Diagnostic** | `GetLatestDiagnosticUseCase` | Obtener último diagnóstico |
| **Pet** | `ManageProfileContextUseCase` | Gestionar mascotas y ambiente |

### Puertos de Salida (Repositories / Out Ports)
Define acceso a datos/servicios externos:

| Módulo | Puerto | Responsabilidad |
|--------|--------|-----------------|
| **Device/Auth** | `UserRepositoryPort` | Persistencia de usuarios |
| **Device/Sensor** | `DeviceRepositoryPort` | Persistencia de dispositivos |
| **Sensor** | `SensorReadingRepositoryPort` | Persistencia de lecturas |
| **Diagnostic** | `DiagnosticRepositoryPort` | Persistencia de diagnósticos |
| **Pet** | `PetContextRepositoryPort` | Persistencia de mascotas/ambiente |
| **Auth** | `TokenProviderPort` | Generación de tokens JWT |
| **Auth** | `GoogleAuthPort` | Integración con Google OAuth |

---

## Tabla de Endpoints Disponibles

### Resumen Completo

```
AUTH (/api/v2/auth)
├── POST   /google          → AuthResponse
├── POST   /login           → AuthResponse
├── POST   /register        → AuthResponse
└── POST   /refresh         → AuthResponse

DEVICE (/api/v2/devices)
├── POST   /link            → LinkDeviceResponse
├── GET    /my-devices      → Flux<DeviceResponseDto>
├── GET    /{deviceId}/readings → Flux<SensorReadingResponseDto>
└── DELETE /{deviceId}      → LinkDeviceResponse

SENSOR (/api/v2/sensors)
└── POST   /reading         → { status, id, airQualityState }

DIAGNOSTIC (/api/v2/diagnostics)
└── GET    /latest          → DiagnosticDomain

PROFILE (/api/v2/profile)
├── GET    /context         → UserContextProfileDomain
├── POST   /pets            → PetProfileDomain
├── DELETE /pets/{petId}    → 204 No Content
└── PUT    /environment     → EnvironmentProfileDomain

DEBUG (/debug) ⚠️
├── GET    /latest-reading  → { readings: [...] }
├── GET    /device-lookup   → { status, deviceId, userCount }
├── GET    /sensor-stats    → { status: "ok" }
└── GET    /test-endpoint   → Test message
```

---

## Notas Importantes

1. **Autenticación:** La mayoría de endpoints requieren JWT Bearer token (`Authorization: Bearer <token>`)
2. **Async/Reactive:** Los controladores usan Project Reactor (`Mono`, `Flux`) para procesamiento reactivo
3. **Sensor Reading Logic:** 
   - Estado de calidad de aire calculado automáticamente en el domain model
   - Sensores: MQ4 (metano), MQ7 (CO), MQ135 (calidad aire general)
4. **DEBUG:** El controlador `/debug` está marcado como solo para debugging local - debe desactivarse en producción
5. **Normalización MAC:** Las direcciones MAC se normalizan a formato `XX:XX:XX:XX:XX:XX` (mayúsculas, dos puntos)
6. **Architecture:** El proyecto sigue **Clean Architecture (Hexagonal)** con separación clara entre dominio, aplicación e infraestructura
