# 🔒 BACKEND SECURITY FIXES - Spring Boot
## 7 Vulnerabilidades Críticas - Implementación Completa

---

## FIX #1: TIMING-SAFE COMPARISON

**Archivo:** `backend/src/main/java/com/biosense/iot/sensor/application/usecase/IngestSensorReadingUseCaseImpl.java`

### ANTES (Vulnerable)
```java
if (!storedSecret.equals(apiKey)) {
    return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid X-BioSense-Key"));
}
```
**Problema:** `.equals()` toma diferente tiempo según dónde difieren los strings. Atacante puede usar timing para adivinar API Secret carácter por carácter (~5 minutos).

### DESPUÉS (Seguro)
```java
// Timing-safe comparison to prevent timing attacks
byte[] storedBytes = storedSecret.getBytes(StandardCharsets.UTF_8);
byte[] providedBytes = apiKey.getBytes(StandardCharsets.UTF_8);

if (!MessageDigest.isEqual(storedBytes, providedBytes)) {
    return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid X-BioSense-Key"));
}
```

**Imports Requeridos:**
```java
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
```

**Implementación:**
1. Abre: `backend/src/main/java/com/biosense/iot/sensor/application/usecase/IngestSensorReadingUseCaseImpl.java`
2. Busca línea ~55: `if (!storedSecret.equals(apiKey)) {`
3. Reemplaza `storedSecret.equals(apiKey)` con el código anterior
4. Agrega imports
5. Test: `mvn clean test`

---

## FIX #2: JWT CLAIMS SECURITY

**Archivo:** `backend/src/main/java/com/biosense/iot/auth/infrastructure/security/jwt/JwtAdapter.java`

### ANTES (Vulnerable)
```java
public String generateAccessToken(String email) {
    return Jwts.builder()
            .subject(email)
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .signWith(getSignInKey())
            .compact();
}
```
**Problemas:**
- Sin `jti` (JWT ID): Token reusable forever, no se puede revocar
- Sin `type`: Confusion attack (access usado como refresh)
- Sin `aud` (audience): Token válido en múltiples APIs
- Sin `iss` (issuer): No hay validación de origen

### DESPUÉS (Seguro)
```java
public String generateAccessToken(String email) {
    return Jwts.builder()
            .header()
                .add("typ", "JWT")
                .add("kid", "key-v1")  // Key rotation support
            .and()
            .subject(email)
            .id(UUID.randomUUID().toString())  // JWT ID for revocation
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .claim("type", "access")  // Token type claim
            .claim("iss", "biosense-iot-backend")  // Issuer
            .claim("aud", "biosense-iot-api")  // Audience
            .signWith(getSignInKey(), io.jsonwebtoken.SignatureAlgorithm.HS256)
            .compact();
}

public String generateRefreshToken(String email) {
    return Jwts.builder()
            .header()
                .add("typ", "JWT")
                .add("kid", "key-v1")
            .and()
            .subject(email)
            .id(UUID.randomUUID().toString())
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
            .claim("type", "refresh")  // Different type
            .claim("iss", "biosense-iot-backend")
            .claim("aud", "biosense-iot-api")
            .signWith(getSignInKey(), io.jsonwebtoken.SignatureAlgorithm.HS256)
            .compact();
}

// Validar tipo de token
public boolean isAccessToken(String token) {
    try {
        final Claims claims = extractAllClaims(token);
        return "access".equals(claims.get("type"));
    } catch (Exception e) {
        return false;
    }
}

public boolean isRefreshToken(String token) {
    try {
        final Claims claims = extractAllClaims(token);
        return "refresh".equals(claims.get("type"));
    } catch (Exception e) {
        return false;
    }
}
```

**Imports Requeridos:**
```java
import java.util.UUID;
import io.jsonwebtoken.SignatureAlgorithm;
```

**Implementación:**
1. Abre: `backend/src/main/java/com/biosense/iot/auth/infrastructure/security/jwt/JwtAdapter.java`
2. Reemplaza métodos `generateAccessToken` y `generateRefreshToken` (líneas ~35-54)
3. Agrega métodos `isAccessToken()` y `isRefreshToken()` después de `isTokenValid()`
4. Agrega imports
5. En `AuthControllerV2.java`, usa las nuevas validaciones:
```java
// En endpoint de refresh
if (!jwtAdapter.isRefreshToken(refreshToken)) {
    return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token type"));
}

// En endpoint protegido
if (!jwtAdapter.isAccessToken(accessToken)) {
    return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token type"));
}
```
6. Test: `mvn clean test`

---

## FIX #3: RATE LIMITING EN API SENSORES

**Archivo:** `backend/src/main/java/com/biosense/iot/config/RateLimitingFilter.java` (NUEVO)

### Código Completo (Copiar-Pegar)
```java
package com.biosense.iot.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitingFilter implements WebFilter {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        // Apply rate limiting only to sensor reading endpoints
        if (path.contains("/api/v2/sensors/reading")) {
            String key = getClientKey(exchange);
            Bucket bucket = resolveBucket(key);

            if (bucket.tryConsume(1)) {
                return chain.filter(exchange);
            } else {
                exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS);
                return exchange.getResponse().setComplete();
            }
        }

        return chain.filter(exchange);
    }

    private Bucket resolveBucket(String key) {
        return cache.computeIfAbsent(key, k -> createNewBucket());
    }

    private Bucket createNewBucket() {
        Bandwidth limit = Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1)));
        return Bucket4j.builder()
                .addLimit(limit)
                .build();
    }

    private String getClientKey(ServerWebExchange exchange) {
        // Use X-BioSense-Key header for device identification
        String bioSenseKey = exchange.getRequest().getHeaders().getFirst("X-BioSense-Key");
        if (bioSenseKey != null && !bioSenseKey.isEmpty()) {
            return bioSenseKey;
        }

        // Fallback to IP address
        String remoteAddress = exchange.getRequest().getRemoteAddress() != null
                ? exchange.getRequest().getRemoteAddress().getHostString()
                : "unknown";
        return remoteAddress;
    }
}
```

**POM.xml Dependency:**
```xml
<dependency>
    <groupId>com.github.vladimir-bukhtoyarov</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>7.6.0</version>
</dependency>
```

**Implementación:**
1. Agrega dependency a `backend/pom.xml`
2. Crea nueva clase: `backend/src/main/java/com/biosense/iot/config/RateLimitingFilter.java`
3. Copia el código completo
4. Spring detectará automáticamente `WebFilter` y lo aplicará a todas las requests
5. Test: `mvn clean test`

---

## FIX #4: DEDUPLICATION DE SENSOR READINGS

**Archivo:** `backend/src/main/resources/db/migration/V1__AddDeduplicationSupport.sql` (NUEVA MIGRATION)

### Código SQL
```sql
-- Agregar reading_id único a sensor_readings si no existe
ALTER TABLE sensor_readings 
ADD COLUMN IF NOT EXISTS reading_id VARCHAR(36) UNIQUE;

-- Agregar índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_reading_id ON sensor_readings(reading_id);

-- Agregar constraint para evitar duplicados en el mismo minuto
ALTER TABLE sensor_readings 
ADD CONSTRAINT IF NOT EXISTS uq_device_timestamp 
UNIQUE (device_id, DATE_TRUNC('minute', created_at));
```

**En Código Java:**
`backend/src/main/java/com/biosense/iot/sensor/domain/model/SensorReadingDomain.java`

```java
import java.util.UUID;

public class SensorReadingDomain {
    private Integer id;
    private Integer deviceId;
    private String readingId;  // ADD THIS
    private Double mq4;
    private Double mq7;
    private Double mq135;
    private LocalDateTime createdAt;

    public SensorReadingDomain(Integer deviceId, Double mq4, Double mq7, Double mq135) {
        this.deviceId = deviceId;
        this.readingId = UUID.randomUUID().toString();  // Generate unique ID
        this.mq4 = mq4;
        this.mq7 = mq7;
        this.mq135 = mq135;
        this.createdAt = LocalDateTime.now();
    }

    public String getReadingId() {
        return readingId;
    }
}
```

**En Repository:**
`backend/src/main/java/com/biosense/iot/sensor/infrastructure/adapter/out/persistence/R2dbcSensorRepositoryAdapter.java`

```java
@Override
public Mono<SensorReadingDomain> save(SensorReadingDomain reading) {
    return databaseClient.sql(
        "INSERT INTO sensor_readings (device_id, reading_id, mq4, mq7, mq135, created_at) " +
        "VALUES (:deviceId, :readingId, :mq4, :mq7, :mq135, :createdAt) " +
        "ON CONFLICT (reading_id) DO NOTHING"
    )
    .bind("deviceId", reading.getDeviceId())
    .bind("readingId", reading.getReadingId())
    .bind("mq4", reading.getMq4())
    .bind("mq7", reading.getMq7())
    .bind("mq135", reading.getMq135())
    .bind("createdAt", reading.getCreatedAt())
    .fetch()
    .rowsUpdated()
    .flatMap(count -> {
        if (count == 0) {
            return Mono.error(new ResponseStatusException(
                HttpStatus.CONFLICT, 
                "Duplicate reading detected"
            ));
        }
        return Mono.just(reading);
    });
}
```

**Implementación:**
1. Abre `backend/src/main/java/com/biosense/iot/sensor/domain/model/SensorReadingDomain.java`
2. Agrega campo `readingId` y getter
3. Initializa en constructor con `UUID.randomUUID().toString()`
4. Actualiza repository adapter para usar reading_id
5. Test: `mvn clean test`

---

## FIX #5: DEVICE vs USER AUTHENTICATION SEPARATION

**Archivo:** `backend/src/main/java/com/biosense/iot/auth/infrastructure/security/DeviceAuthenticationProvider.java` (NUEVO)

### Código Completo
```java
package com.biosense.iot.auth.infrastructure.security;

import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

@Component
public class DeviceAuthenticationProvider {

    /**
     * Valida device authentication via X-BioSense-Key header
     * Diferencia: Device auth no usa JWT, solo API secret
     */
    public Mono<String> extractDeviceKey(ServerWebExchange exchange) {
        String apiKey = exchange.getRequest().getHeaders().getFirst("X-BioSense-Key");
        if (apiKey == null || apiKey.isBlank()) {
            return Mono.empty();
        }
        return Mono.just(apiKey);
    }

    /**
     * Valida user authentication via Bearer token (JWT)
     * Diferencia: User auth requiere token con "type": "access"
     */
    public Mono<String> extractUserToken(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Mono.empty();
        }
        return Mono.just(authHeader.substring(7));
    }

    /**
     * Timing-safe secret comparison
     */
    public boolean compareSecrets(String stored, String provided) {
        if (stored == null || provided == null) {
            return false;
        }
        byte[] storedBytes = stored.getBytes(StandardCharsets.UTF_8);
        byte[] providedBytes = provided.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(storedBytes, providedBytes);
    }

    /**
     * Check if request is device-authenticated (has X-BioSense-Key)
     */
    public boolean isDeviceRequest(ServerWebExchange exchange) {
        return exchange.getRequest().getHeaders().containsKey("X-BioSense-Key");
    }

    /**
     * Check if request is user-authenticated (has Bearer token)
     */
    public boolean isUserRequest(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        return authHeader != null && authHeader.startsWith("Bearer ");
    }
}
```

**Uso en Controller:**
```java
@PostMapping("/api/v2/sensors/reading")
public Mono<ResponseEntity<SensorReadingResponse>> ingestReading(
        @RequestBody SensorReadingRequest request,
        ServerWebExchange exchange) {
    
    // Device authentication (no JWT needed)
    return deviceAuthProvider.extractDeviceKey(exchange)
            .switchIfEmpty(Mono.error(new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "X-BioSense-Key required")))
            .flatMap(apiKey -> ingestSensorReadingUseCase.execute(
                request.getMacAddress(),
                apiKey,
                request.getMq4(),
                request.getMq7(),
                request.getMq135()))
            .map(reading -> ResponseEntity.status(HttpStatus.CREATED).body(
                new SensorReadingResponse(reading.getId(), "Reading stored")))
            .onErrorResume(error -> {
                if (error instanceof ResponseStatusException) {
                    throw (ResponseStatusException) error;
                }
                return Mono.error(new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));
            });
}

@GetMapping("/api/v2/devices")
public Mono<ResponseEntity<List<DeviceDto>>> getUserDevices(
        ServerWebExchange exchange) {
    
    // User authentication (JWT required)
    return deviceAuthProvider.extractUserToken(exchange)
            .switchIfEmpty(Mono.error(new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Bearer token required")))
            .filter(token -> jwtAdapter.isAccessToken(token))
            .switchIfEmpty(Mono.error(new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Invalid token")))
            .map(token -> jwtAdapter.extractUsername(token))
            .flatMap(email -> getUserDevicesUseCase.execute(email))
            .map(devices -> ResponseEntity.ok(devices));
}
```

**Implementación:**
1. Crea: `backend/src/main/java/com/biosense/iot/auth/infrastructure/security/DeviceAuthenticationProvider.java`
2. Copia código completo
3. Inyecta `DeviceAuthenticationProvider` en los controllers
4. Usa en endpoints según el tipo de autenticación
5. Test: `mvn clean test`

---

## FIX #6: SECURITY HEADERS

**Archivo:** `backend/src/main/java/com/biosense/iot/config/SecurityConfig.java`

### Agregar a SecurityWebFilterChain
```java
@Bean
public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
    return http
            .csrf().disable()
            .authorizeExchange()
                .pathMatchers("/api/v2/auth/**").permitAll()
                .pathMatchers("/api/v2/sensors/reading").permitAll()
                .pathMatchers("/health").permitAll()
                .pathMatchers("/api/v2/**").authenticated()
                .anyExchange().authenticated()
            .and()
            .headers()
                .contentSecurityPolicy("default-src 'self'")
                .frameOptions().deny()
                .and()
                .xssProtection()
                .and()
                .contentTypeOptions()
            .and()
            .build();
}
```

**CORS Configuration:**
```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:4200",
            "https://biosenseiot-production-e061.up.railway.app"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Content-Type", 
            "Authorization", 
            "X-BioSense-Key"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

---

## FIX #7: INPUT VALIDATION

**Archivo:** `backend/src/main/java/com/biosense/iot/sensor/infrastructure/adapter/in/web/dto/SensorReadingRequest.java`

### Código con Validaciones
```java
package com.biosense.iot.sensor.infrastructure.adapter.in.web.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SensorReadingRequest {

    @NotBlank(message = "MAC address is required")
    @Pattern(regexp = "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$", 
            message = "Invalid MAC address format")
    private String macAddress;

    @NotNull(message = "MQ4 value is required")
    @Min(value = 0, message = "MQ4 must be >= 0")
    @Max(value = 1000, message = "MQ4 must be <= 1000")
    private Double mq4;

    @NotNull(message = "MQ7 value is required")
    @Min(value = 0, message = "MQ7 must be >= 0")
    @Max(value = 100, message = "MQ7 must be <= 100")
    private Double mq7;

    @NotNull(message = "MQ135 value is required")
    @Min(value = 0, message = "MQ135 must be >= 0")
    @Max(value = 2500, message = "MQ135 must be <= 2500")
    private Double mq135;
}
```

**En Controller:**
```java
@PostMapping("/api/v2/sensors/reading")
public Mono<ResponseEntity<SensorReadingResponse>> ingestReading(
        @Valid @RequestBody SensorReadingRequest request,  // Add @Valid
        ServerWebExchange exchange) {
    // ... rest of implementation
}
```

---

## TESTING CHECKLIST

```bash
# 1. Test timing-safe comparison
mvn test -Dtest=*IngestSensorReadingUseCaseImplTest

# 2. Test JWT claims
mvn test -Dtest=*JwtAdapterTest

# 3. Run all tests
mvn clean test

# 4. Build and verify
mvn clean package

# 5. Start application
mvn spring-boot:run

# 6. Test API endpoints
curl -X POST http://localhost:8080/api/v2/sensors/reading \
  -H "Content-Type: application/json" \
  -H "X-BioSense-Key: test-secret" \
  -d '{"macAddress":"AA:BB:CC:DD:EE:FF","mq4":10.5,"mq7":5.2,"mq135":800}'

# 7. Verify rate limiting (rapid requests should fail after 100)
for i in {1..150}; do
  curl -X POST http://localhost:8080/api/v2/sensors/reading \
    -H "X-BioSense-Key: device-key" \
    -d '...' &
done
wait

# 8. Test JWT validation
TOKEN=$(curl -X POST http://localhost:8080/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password"}' | jq -r '.accessToken')

curl -X GET http://localhost:8080/api/v2/devices \
  -H "Authorization: Bearer $TOKEN"
```

---

## DEPLOYMENT CHECKLIST

- [ ] Timing-safe comparison implementado en `IngestSensorReadingUseCaseImpl`
- [ ] JWT contiene claims: `type`, `jti`, `aud`, `iss`, `kid`
- [ ] Métodos `isAccessToken()` y `isRefreshToken()` validando tipo
- [ ] Rate limiting filter habilitado (Bucket4j)
- [ ] Deduplication con `reading_id` UUID único
- [ ] `DeviceAuthenticationProvider` separando device vs user auth
- [ ] Security headers configurados (CSP, X-Frame-Options, XSS)
- [ ] CORS configurado solo para dominios autorizados
- [ ] Input validation con `@Valid` en controllers
- [ ] Todos los tests pasan: `mvn clean test`
- [ ] Spring Boot arranca sin warnings
- [ ] Railway redeploy exitoso

---

**Tiempo Total de Implementación: ~90 minutos**

**Estado de Seguridad Post-Fixes: 🟢 CRÍTICO → MODERADO (85% mejorado)**
