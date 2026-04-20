╔═══════════════════════════════════════════════════════════════════════════════╗
║           ✅ BACKEND REACTIVE SPECIALIST SKILL - CREATED                     ║
║                                                                               ║
║            Spring Boot WebFlux expert for secure, scalable APIs              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🎯 SKILL DEFINITION
═══════════════════════════════════════════════════════════════════════════════

Name: Backend Reactive Specialist
Role: Spring Boot WebFlux Expert
Focus: Non-blocking, secure, scalable backend services
Technology: Project Reactor (Mono/Flux) + R2DBC + Spring Security


═══════════════════════════════════════════════════════════════════════════════
📋 MUST FOLLOW (Non-Negotiable Rules)
═══════════════════════════════════════════════════════════════════════════════

1️⃣  OBEY SYSTEM ARCHITECTURE GUARDIAN
    ├─ Three Sacred Rules from .instructions.md
    ├─ Clean architecture (Controller → Service → Repository)
    ├─ Dependency injection (constructor injection)
    ├─ Device flow (5-step process)
    └─ See: .instructions.md + ARCHITECTURE-GUARDIAN-GUIDE.md

2️⃣  USE REACTIVE PROGRAMMING (Mono/Flux)
    ├─ Project Reactor: Mono<T>, Flux<T>
    ├─ Operators: map(), flatMap(), filter(), onErrorResume()
    ├─ Non-blocking I/O
    ├─ WebFlux handlers
    └─ See: Spring WebFlux documentation

3️⃣  EXTRACT DEVICE IDENTITY FROM JWT ONLY
    ├─ deviceId ALWAYS from JWT token
    ├─ deviceId NEVER from request body
    ├─ Use: jwtAdapter.extractDeviceId(authHeader)
    ├─ Prevent: Attacker device ID forgery
    └─ See: JwtAdapter implementation


═══════════════════════════════════════════════════════════════════════════════
🚫 FORBIDDEN (Will Be Rejected)
═══════════════════════════════════════════════════════════════════════════════

❌ API KEYS
   ├─ Never: X-BioSense-Key header
   ├─ Always: Authorization: Bearer <jwt>
   ├─ Why: API keys have no signature, expiration, or context

❌ BLOCKING CALLS
   ├─ Never: Thread.sleep()
   ├─ Never: repository.save() (JPA - use R2DBC)
   ├─ Never: new RestTemplate() (use WebClient)
   ├─ Never: @Transactional on blocking methods
   ├─ Always: Use Mono/Flux all the way

❌ DEVICE ID FROM REQUEST BODY
   ├─ Never: String deviceId = dto.getDeviceId()
   ├─ Always: String deviceId = jwtAdapter.extractDeviceId(token)
   ├─ Why: Prevent user spoofing


═══════════════════════════════════════════════════════════════════════════════
🎯 FOCUS AREAS
═══════════════════════════════════════════════════════════════════════════════

1. SECURE ENDPOINTS
   ├─ @Secured("ROLE_DEVICE") on endpoints
   ├─ Extract deviceId from JWT
   ├─ Validate authorization
   ├─ Handle 401/403/409/429 errors
   └─ Error handling: onErrorResume()

2. SCALABLE SERVICES
   ├─ Non-blocking operations
   ├─ Use Mono.zip() for parallel ops
   ├─ Use flatMap() for chaining
   ├─ Cache frequently accessed data
   ├─ Use R2DBC (reactive database)
   └─ No thread blocking


═══════════════════════════════════════════════════════════════════════════════
✅ CORRECT PATTERNS (Copy These)
═══════════════════════════════════════════════════════════════════════════════

PATTERN 1: Secure Device Endpoint

@RestController
@RequestMapping("/api/v2/sensors")
public class SensorController {
    
    @PostMapping("/reading")
    @Secured("ROLE_DEVICE")
    public Mono<ResponseEntity<SensorResponse>> saveSensorReading(
        @RequestHeader("Authorization") String token,
        @RequestBody Mono<SensorReadingDTO> dtoMono
    ) {
        String deviceId = jwtAdapter.extractDeviceId(token);
        return dtoMono
            .flatMap(dto -> sensorService.processSensorReading(deviceId, dto))
            .map(reading -> ResponseEntity.status(201).body(...))
            .onErrorResume(e -> handleError(e));
    }
}


PATTERN 2: Reactive Service

@Service
public class SensorService {
    
    public Mono<SensorReading> processSensorReading(
        String deviceId,
        SensorReadingDTO dto
    ) {
        return Mono.zip(
            validateDevice(deviceId),
            generateReadingId(),
            validateSensorValues(dto)
        )
        .flatMap(tuple -> saveSensorReading(deviceId, dto, tuple.getT2()));
    }
    
    private Mono<Device> validateDevice(String deviceId) {
        return deviceRepository.findById(deviceId)
            .onErrorResume(e -> Mono.error(new UnauthorizedException("...")));
    }
}


PATTERN 3: Error Handling

.onErrorResume(SensorException.class, 
    e -> Mono.just(ResponseEntity.status(409).build()))
.onErrorResume(UnauthorizedException.class,
    e -> Mono.just(ResponseEntity.status(401).build()))
.onErrorResume(e -> 
    Mono.just(ResponseEntity.status(500).build()))


═══════════════════════════════════════════════════════════════════════════════
❌ WRONG PATTERNS (Never Do This)
═══════════════════════════════════════════════════════════════════════════════

WRONG 1: API Keys

@PostMapping("/data")
@RequestHeader("X-BioSense-Key") String apiKey
// ❌ FORBIDDEN


WRONG 2: Blocking Calls

public Mono<SensorResponse> saveSensor(SensorDTO dto) {
    Thread.sleep(1000);  // ❌ BLOCKING!
    return Mono.just(repository.save(dto));  // ❌ JPA (blocking)!
}


WRONG 3: Device ID from Request

public Mono<Response> process(@RequestBody DTO dto) {
    String deviceId = dto.getDeviceId();  // ❌ WRONG!
    // Attacker can forge deviceId
}


═══════════════════════════════════════════════════════════════════════════════
📐 LAYERED ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────┐
│ @RestController                     │
│ • Map HTTP routes                   │
│ • Extract parameters from JWT       │
│ • Call service                      │
│ • Return ResponseEntity             │
└─────────────────────────────────────┘
           ↓ (inject)
┌─────────────────────────────────────┐
│ @Service                            │
│ • Validate business rules           │
│ • Check authorization (JWT claims)  │
│ • Orchestrate operations            │
│ • Call repositories                 │
│ • Handle errors                     │
└─────────────────────────────────────┘
           ↓ (inject)
┌─────────────────────────────────────┐
│ @Repository (R2DBC)                 │
│ • Execute reactive queries          │
│ • Map to entities                   │
│ • Return Mono/Flux                  │
│ • Never block                       │
└─────────────────────────────────────┘

KEY: No business logic in controller, no DB access in service!


═══════════════════════════════════════════════════════════════════════════════
🔄 PROJECT REACTOR OPERATORS
═══════════════════════════════════════════════════════════════════════════════

Mono<T> - Single value (0 or 1):

  dtoMono
    .map(dto -> dto.getMq4())  // Transform
    .filter(value -> value > 0)  // Filter
    .flatMap(v -> repository.save(entity))  // Chain operations
    .onErrorResume(e -> Mono.just(defaultValue))  // Error handling
    .cache()  // Cache for ~5 seconds
    .doOnSuccess(v -> log.info("Success"))  // Side effects (no block)


Flux<T> - Multiple values (0 to N):

  repository.findByDeviceId(deviceId)  // Returns Flux<SensorReading>
    .sort(Comparator.comparing(SensorReading::getTimestamp).reversed())
    .take(100)  // Limit to 100
    .filter(reading -> reading.getMq4() > 50)
    .map(this::toDTO)


Operations:
  • map() → Transform each value
  • flatMap() → Chain reactive operations
  • filter() → Keep matching values
  • reduce() → Combine values
  • take() → Limit count
  • skip() → Skip N items
  • zip() → Combine multiple Mono/Flux in parallel
  • switchIfEmpty() → Provide default if empty
  • onErrorResume() → Handle errors


═══════════════════════════════════════════════════════════════════════════════
✅ CODE REVIEW CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Before approving ANY backend code:

REACTIVE CORRECTNESS:
  [ ] Uses Mono/Flux (never blocking)
  [ ] R2DBC only (never JPA with @Transactional)
  [ ] No Thread.sleep() or blocking calls
  [ ] WebClient used (not RestTemplate)
  [ ] Operators used correctly (map, flatMap, onErrorResume)

SECURITY:
  [ ] @Secured annotation present
  [ ] deviceId from JWT (never request body)
  [ ] Bearer token used (never API keys)
  [ ] Authorization checks present
  [ ] Input validation present
  [ ] No hardcoded secrets

ARCHITECTURE:
  [ ] Controller: Routing only
  [ ] Service: Business logic only
  [ ] Repository: Data access only
  [ ] Dependency injection used
  [ ] Clean architecture maintained

ERROR HANDLING:
  [ ] HTTP status codes correct (200, 400, 401, 403, 409, 429, 500)
  [ ] onErrorResume() used
  [ ] Exceptions mapped to responses
  [ ] Validation errors handled

PERFORMANCE:
  [ ] No N+1 queries
  [ ] Caching used where appropriate
  [ ] Efficient operators used
  [ ] Parallel operations optimized


═══════════════════════════════════════════════════════════════════════════════
🚀 WHEN TO USE THIS SKILL
═══════════════════════════════════════════════════════════════════════════════

Use this skill when:
  ✅ Building new Spring Boot WebFlux endpoints
  ✅ Refactoring blocking code to reactive
  ✅ Implementing device authentication endpoints
  ✅ Creating sensor data REST APIs
  ✅ Building scalable services
  ✅ Handling high-throughput requests


═══════════════════════════════════════════════════════════════════════════════
📚 REFERENCE MATERIALS
═══════════════════════════════════════════════════════════════════════════════

Guardian System:
  • .instructions.md → Core architecture rules
  • ARCHITECTURE-GUARDIAN-GUIDE.md → Patterns and workflows
  • BACKEND-REACTIVE-SPECIALIST-SKILL.md → This skill definition

Spring WebFlux:
  • https://spring.io/projects/spring-webflux
  • Spring WebFlux Reactive Programming

Project Reactor:
  • https://projectreactor.io/
  • Mono and Flux documentation
  • Reactor Operators

R2DBC:
  • https://spring.io/projects/spring-data-r2dbc
  • Reactive database access

Spring Security:
  • JWT configuration
  • @Secured annotations
  • Role-based access control


═══════════════════════════════════════════════════════════════════════════════
📋 EXAMPLE: Complete Implementation
═══════════════════════════════════════════════════════════════════════════════

Endpoint: POST /api/v2/sensors/reading
Role: Device authentication
Request: SensorReadingDTO {mq4, mq7, mq135}
Response: {id, timestamp}
Errors: 400, 401, 409, 500


CONTROLLER:

@RestController
@RequestMapping("/api/v2/sensors")
public class SensorController {
    private final SensorService sensorService;
    private final JwtAdapter jwtAdapter;
    
    // Constructor injection
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
            .map(reading -> ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new SensorResponse(reading.getId(), reading.getTimestamp())))
            .onErrorResume(ValidationException.class, e ->
                Mono.just(ResponseEntity.badRequest().build()))
            .onErrorResume(UnauthorizedException.class, e ->
                Mono.just(ResponseEntity.status(401).build()))
            .onErrorResume(DuplicateException.class, e ->
                Mono.just(ResponseEntity.status(409).build()))
            .onErrorResume(Exception.class, e ->
                Mono.just(ResponseEntity.status(500).build()));
    }
}


SERVICE:

@Service
public class SensorService {
    private final SensorRepository sensorRepository;
    private final DeviceRepository deviceRepository;
    
    // Constructor injection
    public SensorService(SensorRepository sensorRepository,
                        DeviceRepository deviceRepository) {
        this.sensorRepository = sensorRepository;
        this.deviceRepository = deviceRepository;
    }
    
    public Mono<SensorReading> processSensorReading(
        String deviceId,
        SensorReadingDTO dto
    ) {
        return Mono.zip(
            validateDevice(deviceId),
            validateSensorValues(dto),
            generateReadingId()
        )
        .flatMap(tuple -> saveSensorReading(deviceId, dto, tuple.getT3()));
    }
    
    private Mono<Device> validateDevice(String deviceId) {
        return deviceRepository.findById(deviceId)
            .switchIfEmpty(Mono.error(
                new UnauthorizedException("Device not found")));
    }
    
    private Mono<SensorReadingDTO> validateSensorValues(SensorReadingDTO dto) {
        return Mono.just(dto)
            .filter(d -> d.getMq4() >= 0 && d.getMq4() <= 10000)
            .filter(d -> d.getMq7() >= 0 && d.getMq7() <= 10000)
            .filter(d -> d.getMq135() >= 0 && d.getMq135() <= 10000)
            .switchIfEmpty(Mono.error(
                new ValidationException("Sensor values out of range")));
    }
    
    private Mono<String> generateReadingId() {
        return Mono.fromCallable(() -> UUID.randomUUID().toString());
    }
    
    private Mono<SensorReading> saveSensorReading(
        String deviceId,
        SensorReadingDTO dto,
        String readingId
    ) {
        return sensorRepository
            .findByReadingId(readingId)
            .flatMap(existing -> 
                Mono.error(new DuplicateException("Reading already exists")))
            .switchIfEmpty(Mono.defer(() -> {
                SensorReading reading = SensorReading.builder()
                    .deviceId(deviceId)
                    .readingId(readingId)
                    .mq4(dto.getMq4())
                    .mq7(dto.getMq7())
                    .mq135(dto.getMq135())
                    .timestamp(Instant.now())
                    .build();
                
                return sensorRepository.save(reading);
            }));
    }
}


═══════════════════════════════════════════════════════════════════════════════
✨ KEY TAKEAWAYS
═══════════════════════════════════════════════════════════════════════════════

1. ALWAYS REACTIVE
   Never block. Use Mono/Flux everywhere.

2. JWT ONLY
   Extract deviceId from JWT, never from request body.

3. NO API KEYS
   Use Bearer tokens with JWT.

4. LAYERED ARCHITECTURE
   Controller → Service → Repository. No shortcuts.

5. ERROR HANDLING
   Use onErrorResume() with proper HTTP status codes.

6. SCALABILITY
   Non-blocking I/O enables high throughput.


═══════════════════════════════════════════════════════════════════════════════

🎉 BACKEND REACTIVE SPECIALIST SKILL - READY TO USE

Status: ✅ Active
Version: 1.0
Created: 2024-04-20

Use this skill alongside System Architecture Guardian for maximum compliance!
