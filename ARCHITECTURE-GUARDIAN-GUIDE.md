╔═══════════════════════════════════════════════════════════════════════════════╗
║           🏗️ SYSTEM ARCHITECTURE GUARDIAN - USAGE GUIDE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🎯 WHAT IS THIS?
═══════════════════════════════════════════════════════════════════════════════

The System Architecture Guardian is your "enforcer" that ensures ALL code in
BioSenseIoT follows architectural rules consistently.

Think of it as:
  - Code reviewer that knows all the rules
  - Architect that prevents violations
  - Security officer that enforces best practices

Files:
  📄 .instructions.md          → Core rules and enforcement logic
  🔧 validate-architecture.sh  → Automated validation checks

═══════════════════════════════════════════════════════════════════════════════
🚀 HOW TO USE
═══════════════════════════════════════════════════════════════════════════════

1. BEFORE CODING
────────────────

Read .instructions.md to understand:
  ✅ Correct authentication model (User JWT vs Device JWT)
  ✅ Mandatory device flow (5 steps)
  ✅ Data integrity rules (readingId, deviceId source)
  ✅ Clean architecture (layers)
  ✅ Security checklist

2. DURING CODING
─────────────────

Review your code against THREE SACRED RULES:

  Rule 1: Authenticate Correctly
          User JWT (email:password) ≠ Device JWT (deviceId:deviceSecret)

  Rule 2: Trust Only JWT
          deviceId ONLY from JWT, never from request body

  Rule 3: Clean Layers
          Controllers → Routing | Services → Logic | Repos → Data

3. BEFORE COMMITTING
─────────────────────

Run automated validation:

  bash validate-architecture.sh

This checks:
  ✅ No API keys (X-BioSense-Key)
  ✅ Bearer tokens used
  ✅ No hardcoded secrets
  ✅ Database constraints correct
  ✅ HTTPS in firmware
  ✅ Service layer exists

4. BEFORE PULL REQUEST
───────────────────────

Self-review using checklist in .instructions.md:

  Backend Checklist:
    [ ] Correct JWT type used?
    [ ] deviceId from JWT (not request)?
    [ ] Business logic in service (not controller)?
    [ ] Input validated?
    [ ] readingId deduplication?
    [ ] Authorization checks?

  Hardware Checklist:
    [ ] HTTPS only?
    [ ] Bearer token used?
    [ ] readingId generated?
    [ ] Token refresh logic?

  Database Checklist:
    [ ] reading_id UNIQUE?
    [ ] device_id FK references devices?
    [ ] Indexes present?

═══════════════════════════════════════════════════════════════════════════════
🔍 QUICK REFERENCE: WHAT'S CORRECT?
═══════════════════════════════════════════════════════════════════════════════

AUTHENTICATION
──────────────

✅ Correct:
   POST /api/v2/auth/login
   → Response: JWT (access_token) + refresh_token

   POST /api/v2/devices/register
   → Header: Authorization: Bearer <userJWT>
   → Response: deviceId + deviceSecret

   POST /devices/activate
   → Body: deviceId + deviceSecret
   → Response: deviceToken (Device JWT)

   POST /api/v2/sensors/reading
   → Header: Authorization: Bearer <deviceToken>
   → Body: { ..., deviceId, readingId, ... }

❌ Wrong:
   Header: X-BioSense-Key (API key)
   Body: { deviceId: "attacker-device" }
   User JWT for device endpoint
   No Bearer token


DATA INTEGRITY
───────────────

✅ Correct:
   - readingId is UUID (unique per reading)
   - deviceId extracted from JWT token
   - Every reading has timestamp
   - UNIQUE constraint on reading_id in DB

❌ Wrong:
   - No readingId (duplicates allowed)
   - deviceId from request body
   - Missing timestamp
   - No UNIQUE constraint


ARCHITECTURE
─────────────

✅ Correct:
   Controller
     ├─ Map route
     ├─ Parse input
     ├─ Call service
     └─ Format response

   Service
     ├─ Validate business rules
     ├─ Check authorization
     ├─ Call repositories
     └─ Handle errors

   Repository
     ├─ Execute queries
     ├─ Map to entities
     └─ Persist data

❌ Wrong:
   Controller with business logic
   Service calling HTTP directly
   Repository doing calculations


SECURITY
──────────

✅ Correct:
   - HTTPS for all external calls
   - JWT validated on every request
   - deviceId from JWT, not user input
   - Input validated (ranges, types)
   - Secrets in environment variables
   - Timing-safe comparison for passwords

❌ Wrong:
   - HTTP endpoints
   - No token validation
   - deviceId from request
   - Unvalidated input
   - Hardcoded API keys
   - String.equals() for secrets

═══════════════════════════════════════════════════════════════════════════════
⚡ WORKFLOW: Code Review Step by Step
═══════════════════════════════════════════════════════════════════════════════

STEP 1: Identify Component
────────────────────────────

When you see code, ask: "What is this?"

Examples:
  Backend Controller → Check if it's endpoint auth
  Hardware firmware → Check if it's using Bearer token
  Frontend service → Check if it's calling correct endpoints
  Database migration → Check if it has constraints


STEP 2: Trace Authentication
──────────────────────────────

Ask: "Who authenticates here?"

If User authenticates:
  ✅ Expect: User JWT (type: "user")
  ✅ Expect: email in claims
  ❌ Reject: Device JWT usage
  ❌ Reject: API key

If Device authenticates:
  ✅ Expect: Device JWT (type: "device")
  ✅ Expect: deviceId in claims
  ❌ Reject: User JWT usage
  ❌ Reject: API key


STEP 3: Verify Data Source
────────────────────────────

Ask: "Where does deviceId come from?"

✅ Correct sources:
   - From JWT token (token.sub)
   - From JWT extraction
   - From service layer (extracted once)

❌ Wrong sources:
   - From request body
   - From user input
   - From header (other than in JWT)
   - Hardcoded


STEP 4: Check Business Logic Location
───────────────────────────────────────

Ask: "Where is the business logic?"

✅ Correct location:
   - In @Service class
   - Injected into controller
   - Reusable by multiple endpoints

❌ Wrong location:
   - In @Controller class
   - In @Repository class
   - In frontend component
   - Hardcoded


STEP 5: Assess Security
─────────────────────────

Ask: "Is this secure?"

✅ Secure patterns:
   - All inputs validated
   - Secrets encrypted
   - HTTPS used
   - Authorization checked
   - No secrets in logs

❌ Insecure patterns:
   - No validation
   - Hardcoded secrets
   - HTTP used
   - No auth checks
   - Tokens in logs


STEP 6: Decision
─────────────────

Choose one:

✅ APPROVE
   - Follows all rules
   - No violations
   - Ready to merge

🔧 REFACTOR
   - Violations found
   - Specific changes needed
   - Can be fixed quickly

❌ REJECT
   - Critical violations
   - Architecture misunderstanding
   - Needs redesign


═══════════════════════════════════════════════════════════════════════════════
📝 COMMON SCENARIOS
═══════════════════════════════════════════════════════════════════════════════

SCENARIO 1: New Endpoint for Sensors
─────────────────────────────────────

Question: I need a new endpoint POST /api/v2/sensors/stats

Solution:
  1. Ask: "Who should authenticate this?"
     → Answer: Device (has sensor data)

  2. Set up authentication:
     @PostMapping("/api/v2/sensors/stats")
     @Secured("ROLE_DEVICE")
     public Mono<ResponseEntity<>> getStats(
         @RequestHeader("Authorization") String token
     ) { ... }

  3. Extract deviceId from JWT:
     String deviceId = jwtAdapter.extractDeviceId(token);
     ❌ NOT from request body

  4. Validate input:
     if (dto.getLimit() < 0 || dto.getLimit() > 1000) {
         return badRequest();
     }

  5. Put logic in service:
     return statsService.calculateStats(deviceId, dto);

  6. Add repository call:
     return statsRepository.findByDeviceId(deviceId);

Result: ✅ Correct endpoint following all rules


SCENARIO 2: Fixing API Key Usage
──────────────────────────────────

Problem: Code has X-BioSense-Key header

Current:
  http.addHeader("X-BioSense-Key", apiSecret);

Solution:
  1. Replace with Bearer token:
     String token = deviceJwtService.getToken();
     http.addHeader("Authorization", "Bearer " + token);

  2. Make sure ESP32 has token:
     - activateDevice() endpoint stores token
     - Token refreshed before expiry

  3. Backend validates token:
     jwtAdapter.validateDeviceToken(token);

Result: ✅ Secure JWT authentication


SCENARIO 3: User Can't Access Device Data
──────────────────────────────────────────

Problem: User logged in but can't see their device readings

Debugging:
  1. Check user JWT exists:
     ✅ In localStorage?
     ✅ Correct format?
     ✅ Not expired?

  2. Check device is registered:
     ✅ User owns device?
     ✅ Device is active?
     ✅ Device has readings?

  3. Check endpoint authentication:
     GET /api/v2/sensors/readings/{deviceId}
     ├─ Requires user JWT? ✅
     ├─ Validates user owns device? ✅
     └─ Returns 403 if not? ✅

  4. Check authorization:
     @Secured("ROLE_USER")
     public Mono<ResponseEntity<>> getReadings(...) {
         String userId = jwtAdapter.extractUserId(token);
         return repository.findByDeviceIdAndUserId(deviceId, userId);
     }

Result: ✅ User can only see their own devices


═══════════════════════════════════════════════════════════════════════════════
🚨 RED FLAGS: ALWAYS REJECT THESE
═══════════════════════════════════════════════════════════════════════════════

❌ RED FLAG 1: API Keys
   Code: http.addHeader("X-BioSense-Key", apiSecret);
   Why: API keys are insecure (no signature, no expiration)
   Fix: Use JWT Bearer token instead

❌ RED FLAG 2: deviceId from Request
   Code: String deviceId = request.getParameter("deviceId");
   Why: Attacker can forge device ownership
   Fix: Extract from JWT token (server-side only)

❌ RED FLAG 3: Mixed Auth
   Code: if (isUserJWT) { ... } else if (isDeviceJWT) { ... }
   Why: Confusion, security holes
   Fix: Separate endpoints (user endpoints vs device endpoints)

❌ RED FLAG 4: Business Logic in Controller
   Code: @PostMapping("/sensors")
         public void save() {
             // Calculate risk level here
         }
   Why: Not reusable, hard to test, mixes concerns
   Fix: Move to @Service

❌ RED FLAG 5: Hardcoded Secrets
   Code: private static final String JWT_SECRET = "super-secret";
   Why: Secret in source code → exposed on GitHub
   Fix: Use environment variables

❌ RED FLAG 6: No Authorization
   Code: GET /api/v2/sensors/readings
         public List<> getAll() { ... }
   Why: Any user can see any data
   Fix: Add @Secured + verify ownership

❌ RED FLAG 7: HTTP (not HTTPS)
   Code: "http://backend.com/api/..."
   Why: Data can be intercepted
   Fix: Use "https://" always


═══════════════════════════════════════════════════════════════════════════════
✅ DOING IT RIGHT: Examples to Copy
═══════════════════════════════════════════════════════════════════════════════

PATTERN 1: Device Endpoint
──────────────────────────

@RestController
@RequestMapping("/api/v2/sensors")
public class SensorController {

    @PostMapping("/reading")
    @Secured("ROLE_DEVICE")
    public Mono<ResponseEntity<SensorResponse>> saveSensorReading(
        @RequestHeader("Authorization") String authHeader,
        @RequestBody @Valid SensorReadingDTO dto
    ) {
        return jwtAdapter.validateAndExtractDeviceId(authHeader)
            .flatMap(deviceId -> sensorService.processSensorReading(deviceId, dto))
            .map(ResponseEntity::ok)
            .onErrorResume(e -> Mono.just(ResponseEntity.status(401).build()));
    }
}


PATTERN 2: Service Layer
────────────────────────

@Service
public class SensorService {
    
    public Mono<SensorReading> processSensorReading(String deviceId, SensorReadingDTO dto) {
        // Validate input
        if (!isValidSensorValue(dto.getMq4())) {
            return Mono.error(new ValidationException("MQ4 out of range"));
        }
        
        // Generate unique ID
        String readingId = UUID.randomUUID().toString();
        
        // Check deduplication
        return repository.existsByReadingId(readingId)
            .flatMap(exists -> {
                if (exists) {
                    return Mono.error(new DuplicateException());
                }
                
                SensorReading reading = SensorReading.builder()
                    .deviceId(deviceId)  // From JWT, not request
                    .readingId(readingId)
                    .mq4(dto.getMq4())
                    .mq7(dto.getMq7())
                    .mq135(dto.getMq135())
                    .timestamp(Instant.now())
                    .build();
                
                return repository.save(reading);
            });
    }
    
    private boolean isValidSensorValue(float value) {
        return value >= 0 && value <= 10000;
    }
}


PATTERN 3: ESP32 Firmware
──────────────────────────

void sendSensorData(float mq4, float mq7, float mq135) {
    // Get stored device JWT
    String token = preferences.getString("device_token", "");
    
    // Generate unique reading ID
    String readingId = generateReadingId();
    
    // Build JSON payload
    String json = buildJsonPayload(mq4, mq7, mq135, readingId);
    
    // Send with Bearer token
    http.addHeader("Authorization", "Bearer " + token);
    http.addHeader("Content-Type", "application/json");
    
    int response = http.POST(json);
    
    if (response == 200) {
        Serial.println("✅ Data sent");
    } else if (response == 401) {
        Serial.println("Token expired, reactivating...");
        activateDevice();
    } else if (response == 429) {
        Serial.println("Rate limited, waiting...");
        delay(5000);
    }
}


═══════════════════════════════════════════════════════════════════════════════
📞 SUPPORT: What If...?
═══════════════════════════════════════════════════════════════════════════════

Q: "What if I need to use a different authentication method?"
A: Check .instructions.md - there's a reason for current model.
   If truly needed, violate knowingly, document why, and plan refactor.

Q: "What if business logic needs to be in controller?"
A: Extract to service. Controllers are only for HTTP routing.

Q: "What if user input is needed for deviceId?"
A: NEVER. Always extract deviceId from JWT token on server-side.

Q: "What if I want to use API keys?"
A: NEVER. API keys are less secure than JWT. Use JWT instead.

Q: "What if existing code violates rules?"
A: Legacy doesn't excuse violations. Refactor before using.

Q: "What if validation is expensive?"
A: Validate anyway. Security > Performance in this case.


═══════════════════════════════════════════════════════════════════════════════
🎓 LEARNING PATH
═══════════════════════════════════════════════════════════════════════════════

Day 1: READ
  → Read .instructions.md (entire document)
  → Read this guide (entire document)

Day 2: UNDERSTAND
  → Three Sacred Rules (memorize them)
  → Device flow (understand 5 steps)
  → Clean architecture (layers matter)

Day 3: APPLY
  → Review existing code against rules
  → Fix violations in your own code
  → Validate with validate-architecture.sh

Day 4+: ENFORCE
  → Review PRs using this framework
  → Explain violations clearly
  → Help others follow rules


═══════════════════════════════════════════════════════════════════════════════
🎯 FINAL CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Before declaring code "ready":

[ ] Read .instructions.md THREE TIMES (minimum)
[ ] Memorized THREE SACRED RULES
[ ] Understand Device Flow (5 steps)
[ ] No X-BioSense-Key or API keys
[ ] JWT properly used (Bearer token)
[ ] deviceId always from JWT
[ ] Business logic in service
[ ] Input validation present
[ ] readingId deduplication implemented
[ ] HTTPS only (no HTTP)
[ ] Authorization checks exist
[ ] Error handling correct (401, 403, 409, 429)
[ ] Secrets not hardcoded
[ ] validate-architecture.sh PASSES
[ ] Code reviewed by someone else
[ ] Ready for production? YES ✅

═══════════════════════════════════════════════════════════════════════════════

Document: System Architecture Guardian - Usage Guide
Version: 2.1
Last Updated: 2024-04-20
Status: ✅ ACTIVE - Reference daily
