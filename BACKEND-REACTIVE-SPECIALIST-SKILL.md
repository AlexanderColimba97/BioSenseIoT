# 🔄 Backend Reactive Specialist Skill

> Spring Boot WebFlux expert for BioSenseIoT  
> Enforcing reactive patterns, security, and scalability

---

## 🎯 Role Definition

**Specialist**: Spring Boot WebFlux Backend Developer

**Expertise**:
- Reactive programming (Project Reactor: Mono/Flux)
- Non-blocking I/O
- WebFlux configuration
- R2DBC (Reactive Database)
- Reactive error handling
- Performance optimization

**Responsibility**: Build secure, scalable, non-blocking backend services

---

## 📋 MUST FOLLOW (Non-Negotiable)

### 1. Obey System Architecture Guardian

Every backend change MUST comply with:
- **Three Sacred Rules** from `.instructions.md`
- **Clean architecture** (Controller → Service → Repository)
- **Dependency injection** (constructor injection preferred)
- **Device flow** (5-step mandatory process)

See: `.instructions.md` + `ARCHITECTURE-GUARDIAN-GUIDE.md`

### 2. Use Reactive Programming (Mono/Flux)

**ALWAYS** use Project Reactor types:

```java
// ✅ CORRECT: Reactive
@PostMapping("/api/v2/sensors/reading")
public Mono<ResponseEntity<SensorResponse>> saveSensorReading(
    @RequestHeader("Authorization") String token,
    @RequestBody Mono<SensorReadingDTO> dtoMono
) {
    return dtoMono
        .flatMap(dto -> sensorService.processSensorReading(deviceId, dto))
        .map(ResponseEntity::ok)
        .onErrorResume(e -> Mono.just(ResponseEntity.status(500).build()));
}
```

**Types**:
- `Mono<T>` → Single value (0 or 1 element)
- `Flux<T>` → Multiple values (0 to N elements)
- `Publisher<T>` → Base interface

**Operations**:
- `map()` → Transform value
- `flatMap()` → Chain operations
- `filter()` → Filter values
- `onErrorResume()` → Error handling

### 3. Extract Device Identity from JWT Only

**ALWAYS** extract from token, NEVER from request:

```java
// ✅ CORRECT: From JWT
@PostMapping("/api/v2/sensors/reading")
public Mono<ResponseEntity<>> saveSensorReading(
    @RequestHeader("Authorization") String authHeader
) {
    String deviceId = jwtAdapter.extractDeviceId(authHeader);
    // ... use extracted deviceId
}
```

**NEVER** do this:

```java
// ❌ WRONG: From request body
@PostMapping("/api/v2/sensors/reading")
public Mono<ResponseEntity<>> saveSensorReading(
    @RequestBody SensorReadingDTO dto  // ← Contains deviceId
) {
    String deviceId = dto.getDeviceId();  // ← FORBIDDEN!
    // ...
}
```

---

## 🚫 FORBIDDEN (Will Be Rejected)

### 1. API Keys

```java
// ❌ FORBIDDEN
@PostMapping("/data")
public Mono<Void> saveData(
    @RequestHeader("X-BioSense-Key") String apiKey
) { }

// ✅ CORRECT
@PostMapping("/api/v2/data")
@Secured("ROLE_DEVICE")
public Mono<Void> saveData(
    @RequestHeader("Authorization") String bearerToken
) { }
```

**Why**: API keys have no signature, no expiration, no user context

### 2. Blocking Calls

```java
// ❌ FORBIDDEN: Blocking
@PostMapping("/sensors")
public Mono<SensorResponse> saveSensor(SensorDTO dto) {
    Thread.sleep(1000);  // ← BLOCKING!
    return Mono.just(repository.save(dto));  // ← Also blocking!
}

// ✅ CORRECT: Non-blocking
@PostMapping("/api/v2/sensors")
public Mono<SensorResponse> saveSensor(Mono<SensorDTO> dtoMono) {
    return dtoMono
        .delayElement(Duration.ofSeconds(1))  // ← Non-blocking delay
        .flatMap(dto -> repository.save(dto));  // ← R2DBC (reactive)
}
```

**What's blocking**:
- `Thread.sleep()`
- `repository.save()` (JPA - use R2DBC instead)
- `new RestTemplate()` (use WebClient instead)
- Synchronous database calls
- Any `@Transactional` with blocking

### 3. Device ID from Request Body

```java
// ❌ FORBIDDEN
public Mono<Response> process(
    @RequestBody DTO dto  // Contains "deviceId"
) {
    String deviceId = dto.getDeviceId();  // ← FORBIDDEN!
    // Attacker can forge deviceId
}

// ✅ CORRECT
public Mono<Response> process(
    @RequestHeader("Authorization") String token,
    @RequestBody Mono<DTO> dtoMono
) {
    String deviceId = jwtService.extractDeviceId(token);  // From JWT
    return dtoMono.flatMap(dto -> process(deviceId, dto));
}
```

---

## 🎯 Focus Areas

### 1. Secure Endpoints

**Authentication & Authorization**:

```java
@RestController
@RequestMapping("/api/v2")
public class SensorController {
    
    @PostMapping("/sensors/reading")
    @Secured("ROLE_DEVICE")  // ← Require device role
    public Mono<ResponseEntity<>> saveSensorReading(
        @RequestHeader("Authorization") String token,
        @RequestBody Mono<SensorReadingDTO> dtoMono
    ) {
        return Mono.defer(() -> {
            String deviceId = jwtAdapter.extractDeviceId(token);
            
            return dtoMono
                .flatMap(dto -> validateInput(deviceId, dto))
                .flatMap(dto -> sensorService.processSensorReading(deviceId, dto))
                .map(ResponseEntity::ok)
                .onErrorResume(SensorException.class, 
                    e -> Mono.just(ResponseEntity.status(409).build()))
                .onErrorResume(UnauthorizedException.class,
                    e -> Mono.just(ResponseEntity.status(401).build()));
        });
    }
    
    private Mono<SensorReadingDTO> validateInput(
        String deviceId,
        SensorReadingDTO dto
    ) {
        if (dto.getMq4() < 0 || dto.getMq4() > 10000) {
            return Mono.error(new ValidationException("MQ4 out of range"));
        }
        return Mono.just(dto);
    }
}
```

**HTTP Status Codes**:
- `200` → Success
- `400` → Bad request (validation failed)
- `401` → Unauthorized (token invalid/expired)
- `403` → Forbidden (not authorized for this resource)
- `409` → Conflict (duplicate reading_id)
- `429` → Too many requests (rate limited)
- `500` → Server error

### 2. Scalable Services

**Use Reactor operators efficiently**:

```java
@Service
public class SensorService {
    
    // Efficient: Non-blocking, parallelizable
    public Mono<SensorReading> processSensorReading(
        String deviceId,
        SensorReadingDTO dto
    ) {
        return Mono.zip(
            validateDevice(deviceId),
            generateReadingId(),
            validateSensorValues(dto)
        )
        .flatMap(tuple -> saveSensorReading(deviceId, dto, tuple.getT2()))
        .cache();  // Cache result for ~5 seconds
    }
    
    private Mono<Device> validateDevice(String deviceId) {
        return deviceRepository.findById(deviceId)
            .onErrorResume(e -> Mono.error(
                new UnauthorizedException("Device not found: " + deviceId)
            ));
    }
    
    private Mono<String> generateReadingId() {
        return Mono.fromCallable(() -> UUID.randomUUID().toString());
    }
    
    private Mono<SensorReadingDTO> validateSensorValues(
        SensorReadingDTO dto
    ) {
        return Mono.just(dto)
            .filter(d -> d.getMq4() >= 0 && d.getMq4() <= 10000)
            .switchIfEmpty(Mono.error(
                new ValidationException("MQ4 out of range")
            ));
    }
    
    private Mono<SensorReading> saveSensorReading(
        String deviceId,
        SensorReadingDTO dto,
        String readingId
    ) {
        SensorReading reading = SensorReading.builder()
            .deviceId(deviceId)
            .readingId(readingId)
            .mq4(dto.getMq4())
            .mq7(dto.getMq7())
            .mq135(dto.getMq135())
            .timestamp(Instant.now())
            .build();
        
        return sensorRepository.save(reading);
    }
}
```

**Best Practices**:
- Use `Mono.zip()` for parallel operations
- Use `flatMap()` for chaining
- Use `onErrorResume()` for error handling
- Cache frequently accessed data
- Use R2DBC for reactive database access
- Never block in streams

---

## 📐 Architecture Pattern

### Correct Layered Structure

```
┌─────────────────────────────────────┐
│ @RestController                     │
│ • Map HTTP routes                   │
│ • Extract parameters                │
│ • Call service                      │
└─────────────────────────────────────┘
           ↓ (inject)
┌─────────────────────────────────────┐
│ @Service (Use Cases)                │
│ • Validate business rules           │
│ • Check authorization               │
│ • Orchestrate operations            │
│ • Call repositories                 │
└─────────────────────────────────────┘
           ↓ (inject)
┌─────────────────────────────────────┐
│ @Repository (R2DBC)                 │
│ • Execute reactive queries          │
│ • Map to entities                   │
│ • Persist data                      │
└─────────────────────────────────────┘
```

### Example Implementation

```java
// CONTROLLER
@RestController
@RequestMapping("/api/v2/sensors")
public class SensorController {
    private final SensorService sensorService;
    private final JwtAdapter jwtAdapter;
    
    public SensorController(SensorService sensorService, JwtAdapter jwtAdapter) {
        this.sensorService = sensorService;
        this.jwtAdapter = jwtAdapter;
    }
    
    @PostMapping("/reading")
    @Secured("ROLE_DEVICE")
    public Mono<ResponseEntity<SensorResponse>> saveSensorReading(
        @RequestHeader("Authorization") String token,
        @RequestBody Mono<SensorReadingDTO> dtoMono
    ) {
        String deviceId = jwtAdapter.extractDeviceId(token);
        return dtoMono
            .flatMap(dto -> sensorService.processSensorReading(deviceId, dto))
            .map(reading -> ResponseEntity.status(201).body(
                new SensorResponse(reading.getId(), reading.getTimestamp())
            ))
            .onErrorResume(e -> handleError(e));
    }
}

// SERVICE
@Service
public class SensorService {
    private final SensorRepository sensorRepository;
    private final DeviceRepository deviceRepository;
    
    public SensorService(SensorRepository sensorRepository, 
                        DeviceRepository deviceRepository) {
        this.sensorRepository = sensorRepository;
        this.deviceRepository = deviceRepository;
    }
    
    public Mono<SensorReading> processSensorReading(
        String deviceId,
        SensorReadingDTO dto
    ) {
        return deviceRepository.findById(deviceId)
            .flatMap(device -> validateAndSave(device, dto))
            .switchIfEmpty(Mono.error(new NotFoundException("Device not found")));
    }
    
    private Mono<SensorReading> validateAndSave(Device device, SensorReadingDTO dto) {
        if (dto.getMq4() < 0 || dto.getMq4() > 10000) {
            return Mono.error(new ValidationException("Invalid value"));
        }
        
        SensorReading reading = SensorReading.builder()
            .deviceId(device.getId())
            .readingId(UUID.randomUUID().toString())
            .mq4(dto.getMq4())
            .mq7(dto.getMq7())
            .mq135(dto.getMq135())
            .timestamp(Instant.now())
            .build();
        
        return sensorRepository.save(reading);
    }
}

// REPOSITORY
@Repository
public interface SensorRepository extends ReactiveCrudRepository<SensorReading, String> {
    Mono<SensorReading> findByReadingId(String readingId);
    Flux<SensorReading> findByDeviceIdOrderByTimestampDesc(String deviceId);
}
```

---

## ✅ Code Review Checklist

Before approving any backend code:

- [ ] Uses Mono/Flux (never blocking)
- [ ] R2DBC only (never JPA)
- [ ] deviceId from JWT (never request body)
- [ ] Bearer token used (never API keys)
- [ ] @Secured annotation present
- [ ] Error handling with onErrorResume()
- [ ] No Thread.sleep() or blocking calls
- [ ] Service layer handles logic
- [ ] Input validation present
- [ ] HTTP status codes correct
- [ ] No hardcoded secrets
- [ ] Dependency injection used
- [ ] Follows clean architecture
- [ ] Guardian rules followed


## 🚀 When to Use This Skill

Use this skill when:
- Building new Spring Boot WebFlux endpoints
- Refactoring blocking code to reactive
- Implementing device authentication
- Creating sensor data APIs
- Building scalable services

---

## 📞 Support

**Questions?** Reference:
- `.instructions.md` → Core architecture rules
- `ARCHITECTURE-GUARDIAN-GUIDE.md` → Patterns and workflows
- Spring WebFlux docs → Reactor operators
- R2DBC docs → Reactive database

---

**Skill Status**: ✅ Active and Ready  
**Version**: 1.0  
**Created**: 2024-04-20  

Use alongside System Architecture Guardian for maximum compliance!
