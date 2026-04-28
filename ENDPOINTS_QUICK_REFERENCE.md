# Tabla Rápida - Endpoints BioSenseIoT Backend

## 📋 Resumen Ejecutivo de Endpoints

| Controller | Método | Endpoint | Auth | Parámetros | DTO Response | Descripción |
|-----------|--------|----------|------|-----------|--------------|------------|
| **AUTH** | POST | `/api/v2/auth/google` | ❌ | `{idToken}` | `AuthResponse` | Login Google |
| **AUTH** | POST | `/api/v2/auth/login` | ❌ | `{email, password}` | `AuthResponse` | Login email/contraseña |
| **AUTH** | POST | `/api/v2/auth/register` | ❌ | `{email, password, fullName}` | `AuthResponse` | Registro |
| **AUTH** | POST | `/api/v2/auth/refresh` | ❌ | `{refreshToken, accessToken}` | `AuthResponse` | Refrescar tokens |
| **DEVICE** | POST | `/api/v2/devices/link` | ✅ | `{macAddress, deviceName}` | `LinkDeviceResponse` | Vincular dispositivo |
| **DEVICE** | GET | `/api/v2/devices/my-devices` | ✅ | — | `DeviceResponseDto[]` | Mis dispositivos |
| **DEVICE** | GET | `/api/v2/devices/{deviceId}/readings` | ✅ | `limit=100` | `SensorReadingResponseDto[]` | Lecturas dispositivo |
| **DEVICE** | DELETE | `/api/v2/devices/{deviceId}` | ✅ | — | `LinkDeviceResponse` | Desvincular dispositivo |
| **SENSOR** | POST | `/api/v2/sensors/reading` | ⚠️ | `{macAddress, mq4, mq7, mq135}` | `{status, id, airQualityState}` | Ingestar lectura ESP32 |
| **DIAGNOSTIC** | GET | `/api/v2/diagnostics/latest` | ✅ | — | `DiagnosticDomain` | Último diagnóstico |
| **PROFILE** | GET | `/api/v2/profile/context` | ✅ | — | `UserContextProfileDomain` | Contexto usuario |
| **PROFILE** | POST | `/api/v2/profile/pets` | ✅ | `PetRequest` | `PetProfileDomain` | Crear/actualizar mascota |
| **PROFILE** | DELETE | `/api/v2/profile/pets/{petId}` | ✅ | — | `204 No Content` | Eliminar mascota |
| **PROFILE** | PUT | `/api/v2/profile/environment` | ✅ | `EnvironmentRequest` | `EnvironmentProfileDomain` | Perfil ambiente |
| **DEBUG** | GET | `/debug/latest-reading` | ❌ | `macAddress, limit=10` | JSON de lecturas | 🚫 Solo debug |
| **DEBUG** | GET | `/debug/device-lookup` | ❌ | `macAddress` | JSON de resolución | 🚫 Solo debug |
| **DEBUG** | GET | `/debug/sensor-stats` | ❌ | — | JSON | 🚫 Solo debug |

**Leyenda:** ✅ = Requiere Auth | ❌ = Sin Auth | ⚠️ = Header Bearer (apiKey) opcional

---

## 🏗️ Domain Models (DTOs)

### UserDomain
```json
{
  "id": 1,
  "email": "user@example.com",
  "fullName": "John Doe",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

### DeviceDomain
```json
{
  "id": 5,
  "macAddress": "XX:XX:XX:XX:XX:XX",
  "name": "Sensor Sala",
  "userId": 1,
  "apiSecret": "secret_key"
}
```

### SensorReadingDomain
```json
{
  "id": 12345,
  "deviceId": 5,
  "readingId": "XX:XX:XX:XX:XX:XX-123456789",
  "mq4": 42.88,
  "mq7": 74.83,
  "mq135": 150.25,
  "timestamp": "2026-04-21T14:25:30Z",
  "airQualityState": "WARNING"
}
```

**Air Quality States:**
- `CLEAN` - mq7 ≤ 100 AND mq135 ≤ 200
- `WARNING` - mq7 > 100 OR mq135 > 200
- `DANGER` - mq7 > 200 OR mq135 > 400

### PetProfileDomain
```json
{
  "id": 1,
  "userId": 1,
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
```

### EnvironmentProfileDomain
```json
{
  "id": 1,
  "profileName": "Casa Principal",
  "spaceType": "HOUSE",
  "areaType": "MIXED_USE",
  "ventilationLevel": "NORMAL",
  "urbanContext": "SUBURBAN",
  "notes": "Casa con jardín",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-04-21T14:25:30Z"
}
```

### DiagnosticDomain
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

### UserContextProfileDomain
```json
{
  "email": "user@example.com",
  "pets": [{ PetProfileDomain }],
  "environment": { EnvironmentProfileDomain }
}
```

---

## 🔌 Use Cases / In Ports

| Módulo | Use Case | Entrada | Salida |
|--------|----------|---------|--------|
| **Auth** | `AuthenticateWithGoogleUseCase` | `idToken: String` | `AuthResponse` |
| **Auth** | `LoginUseCase` | `email, password` | `AuthResponse` |
| **Auth** | `RegisterUseCase` | `email, password, fullName` | `AuthResponse` |
| **Device** | `LinkDeviceUseCase` | `email, macAddress, deviceName` | `DeviceDomain` |
| **Device** | `GetUserDevicesUseCase` | `email` | `Flux<DeviceDomain>` |
| **Sensor** | `IngestSensorReadingUseCase` | `macAddress, readingId, apiKey, mq4, mq7, mq135` | `SensorReadingDomain` |
| **Sensor** | `GetDeviceReadingsUseCase` | `email, deviceId, limit` | `Flux<SensorReadingDomain>` |
| **Diagnostic** | `GetLatestDiagnosticUseCase` | `email` | `DiagnosticDomain` |
| **Pet** | `ManageProfileContextUseCase::getContext` | `email` | `UserContextProfileDomain` |
| **Pet** | `ManageProfileContextUseCase::upsertPet` | `email, pet` | `PetProfileDomain` |
| **Pet** | `ManageProfileContextUseCase::deletePet` | `email, petId` | `Void` |
| **Pet** | `ManageProfileContextUseCase::upsertEnvironment` | `email, environment` | `EnvironmentProfileDomain` |

---

## 📦 Repository Ports (Out Ports)

| Repositorio | Métodos |
|-------------|---------|
| `UserRepositoryPort` | `findByEmail()`, `save()`, `update()` |
| `DeviceRepositoryPort` | `getLinkedDeviceId()`, `getUserIdsByDeviceId()`, `save()`, `delete()` |
| `SensorReadingRepositoryPort` | `getReadingsByDeviceId()`, `save()` |
| `DiagnosticRepositoryPort` | `findLatestByEmail()`, `save()` |
| `PetContextRepositoryPort` | `findByUserId()`, `save()`, `delete()` |
| `TokenProviderPort` | `generateToken()`, `validateToken()`, `refreshToken()` |
| `GoogleAuthPort` | `verifyToken()`, `getGoogleUserInfo()` |

---

## 🔐 Autenticación

### Bearer Token (JWT)
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response AuthResponse
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

---

## 📊 Sensores (Soportados)

| Sensor | Variable | Unidad | Rango | Descripción |
|--------|----------|--------|-------|------------|
| **MQ-4** | `mq4` | ppm | 0-10000 | Metano (gas natural, detección de fugas) |
| **MQ-7** | `mq7` | ppm | 0-1000 | Monóxido de Carbono (CO) |
| **MQ-135** | `mq135` | ppm | 0-1000 | Calidad del aire general (NH3, Alcohol, Humo) |

---

## 🚀 Endpoints sin Autenticación (Públicos)

1. `POST /api/v2/auth/google`
2. `POST /api/v2/auth/login`
3. `POST /api/v2/auth/register`
4. `POST /api/v2/auth/refresh`
5. `POST /api/v2/sensors/reading` (con Bearer apiKey opcional)
6. `/debug/*` (Solo para debugging)

---

## 🔒 Endpoints con Autenticación

Todos en `GET /api/v2/devices/*`, `GET /api/v2/diagnostics/*`, `GET /api/v2/profile/*` requieren JWT válido en header `Authorization`.
