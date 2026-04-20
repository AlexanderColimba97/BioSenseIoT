╔═══════════════════════════════════════════════════════════════════════════════╗
║                    ⚙️  CÓMO USAR LAS SKILLS                                  ║
║                                                                               ║
║         Guía práctica para utilizar las 5 skills de BioSenseIoT              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🎯 ¿QUÉ SON LAS SKILLS?
═══════════════════════════════════════════════════════════════════════════════

Las SKILLS son **plantillas de especialistas** que definen:

✅ Qué reglas DEBES seguir (NO NEGOCIABLES)
✅ Qué patrones DEBES usar (copy-paste ready)
✅ Qué se PROHIBE hacer (red flags)
✅ Cómo revisar código (checklist)

Cada skill es un experto en su área que **SUPERVISA tu trabajo** antes de 
que llegue a producción.


═══════════════════════════════════════════════════════════════════════════════
📋 LAS 5 SKILLS DISPONIBLES
═══════════════════════════════════════════════════════════════════════════════

1. 🏗️  SYSTEM ARCHITECTURE GUARDIAN
   ├─ Archivo: .instructions.md
   ├─ Rol: Arquitecto de sistemas (supervisa TODOS los cambios)
   ├─ Reglas: Three Sacred Rules + device flow
   ├─ Usa cuando: Necesitas entender los principios del proyecto
   └─ Obligatorio: SÍ (todas las skills lo obedecen)

2. 🔧 BACKEND REACTIVE SPECIALIST
   ├─ Archivo: BACKEND-REACTIVE-SPECIALIST-SKILL.md
   ├─ Rol: Experto en Spring Boot WebFlux
   ├─ Reglas: Reactive programming, JWT-only auth, no API keys
   ├─ Usa cuando: Escribes código Java/Kotlin en backend
   └─ Tecnología: Spring Boot, R2DBC, Mono/Flux

3. 📡 ESP32 IOT SPECIALIST
   ├─ Archivo: ESP32-IOT-SPECIALIST-SKILL.md
   ├─ Rol: Experto en firmware seguro para ESP32
   ├─ Reglas: HTTPS, device JWT, retry logic, token refresh
   ├─ Usa cuando: Programas el ESP32
   └─ Tecnología: Arduino, TLS, HTTP client

4. 🗄️  DATABASE ARCHITECT
   ├─ Archivo: DATABASE-ARCHITECT-SKILL.md
   ├─ Rol: Experto en PostgreSQL y integridad de datos
   ├─ Reglas: Device ownership, foreign keys, deduplication
   ├─ Usa cuando: Diseñas esquema o escribes SQL
   └─ Tecnología: PostgreSQL, R2DBC

5. 🎨 FRONTEND UI SPECIALIST
   ├─ Archivo: FRONTEND-UI-SPECIALIST-SKILL.md
   ├─ Rol: Experto en React/Next.js seguro
   ├─ Reglas: No secrets, httpOnly tokens, UX clara
   ├─ Usa cuando: Programas components React/Next.js
   └─ Tecnología: React 18+, Next.js, TypeScript


═══════════════════════════════════════════════════════════════════════════════
🚀 FLUJO DE TRABAJO: CÓMO USAR LAS SKILLS
═══════════════════════════════════════════════════════════════════════════════

PASO 1: Entender el contexto
────────────────────────────
Identifica qué tipo de código vas a escribir:

  Backend Java/Kotlin → Usa BACKEND REACTIVE SPECIALIST
  Firmware ESP32     → Usa ESP32 IOT SPECIALIST
  Base de datos      → Usa DATABASE ARCHITECT
  Frontend React     → Usa FRONTEND UI SPECIALIST
  Arquitectura       → Usa SYSTEM ARCHITECTURE GUARDIAN


PASO 2: Leer la skill correspondiente
─────────────────────────────────────
Abre el archivo de la skill:

  cd C:\Users\alexi\Desktop\BioSenseIoT

  # Backend
  cat BACKEND-REACTIVE-SPECIALIST-SKILL.md

  # ESP32
  cat ESP32-IOT-SPECIALIST-SKILL.md

  # Database
  cat DATABASE-ARCHITECT-SKILL.md

  # Frontend
  cat FRONTEND-UI-SPECIALIST-SKILL.md

  # Arquitectura
  cat .instructions.md


PASO 3: Revisar las reglas MUST FOLLOW
──────────────────────────────────────
Cada skill tiene 3-4 reglas NON-NEGOTIABLE:

EJEMPLO - Backend Reactive Specialist:
  ✅ Regla 1: Use reactive programming (Mono/Flux)
  ✅ Regla 2: Never use API keys
  ✅ Regla 3: Extract deviceId from JWT only
  ✅ Regla 4: No blocking calls (no JPA)

Si violas estas reglas, tu PR será **RECHAZADO**.


PASO 4: Copiar el patrón correcto
──────────────────────────────────
La skill tiene secciones "✅ CORRECT PATTERN":

EJEMPLO - Database Architect (Deduplication):

  CREATE TABLE sensor_readings (
      id UUID PRIMARY KEY,
      device_id UUID NOT NULL,
      reading_id VARCHAR(255) NOT NULL,
      
      -- Prevent duplicates
      CONSTRAINT unique_reading_id_per_device 
          UNIQUE (device_id, reading_id),
      
      CONSTRAINT fk_device_id 
          FOREIGN KEY (device_id) 
          REFERENCES devices(id) 
          ON DELETE CASCADE
  );

COPIA ESTE PATRÓN exactamente.


PASO 5: Buscar qué se PROHIBE
──────────────────────────────
Cada skill tiene sección "❌ WRONG PATTERN":

EJEMPLO - Frontend (token inseguro):

  ❌ WRONG:
    localStorage.setItem("token", jwt);

  ✅ CORRECT:
    const [token, setToken] = useState(null);  // Memory only

Si haces algo de la lista "WRONG", será rechazado.


PASO 6: Usar el CHECKLIST de code review
──────────────────────────────────────────
Antes de hacer un PR, revisa tu código con la checklist:

EJEMPLO - Backend Reactive Specialist Checklist:

  [ ] All endpoints return Mono or Flux
  [ ] No @Autowired on services (use constructor injection)
  [ ] No JPA (use R2DBC)
  [ ] Error handling with onErrorResume
  [ ] Authorization check present
  [ ] No API keys in code
  [ ] No hardcoded endpoints
  [ ] Proper HTTP status codes
  [ ] Logging configured
  [ ] Tests written

Si tu código NO cumple la checklist, revísalo antes de hacer PR.


PASO 7: Hacer el PR (Pull Request)
──────────────────────────────────
Cuando hagas un PR, incluye:

  Título:
    "[Backend Reactive Specialist] Add GET /devices endpoint"

  Descripción:
    Which skill guided this change?
    - Backend Reactive Specialist ✅

    Does it comply with rules?
    - ✅ Uses reactive (Mono/Flux)
    - ✅ No blocking calls
    - ✅ JWT-only auth
    - ✅ Authorization enforced

    Code review checklist:
    - ✅ All items passed

  Una vez aprobado por el Guardian, merge!


═══════════════════════════════════════════════════════════════════════════════
📚 EJEMPLOS PRÁCTICOS POR ÁREA
═══════════════════════════════════════════════════════════════════════════════

ESCENARIO 1: Implementar endpoint para obtener lecturas de sensores
──────────────────────────────────────────────────────────────────

Tu tarea: Crear GET /api/v2/sensors/readings/{deviceId}

  1. ¿Qué tipo de código? → Backend
  2. Leer: BACKEND-REACTIVE-SPECIALIST-SKILL.md
  3. Reglas clave:
     - Use Mono/Flux (reactive)
     - Extract deviceId from JWT
     - No @Autowired
     - Handle 401/403 errors
  4. Patrón correcto (copy-paste):

     @RestController
     @RequestMapping("/api/v2/sensors")
     public class SensorController {
         
         private final SensorService sensorService;
         
         public SensorController(SensorService sensorService) {
             this.sensorService = sensorService;
         }
         
         @GetMapping("/readings/{deviceId}")
         public Mono<ResponseEntity<List<SensorReading>>> getReadings(
             @PathVariable String deviceId,
             @AuthenticationPrincipal Mono<JwtAuthenticationToken> auth
         ) {
             return auth
                 .flatMap(token -> {
                     String userId = token.getName();
                     return sensorService.getReadings(deviceId, userId);
                 })
                 .map(readings -> ResponseEntity.ok(readings))
                 .onErrorResume(ex -> {
                     if (ex instanceof UnauthorizedException) {
                         return Mono.just(ResponseEntity.status(401).build());
                     }
                     return Mono.just(ResponseEntity.status(500).build());
                 });
         }
     }

  5. Checklist antes de PR:
     [ ] Returns Mono
     [ ] JWT extracted (not from request body)
     [ ] Authorization check (userId matches)
     [ ] Error handling
     [ ] No API keys
     ✅ APROBADO


ESCENARIO 2: Diseñar tabla de dispositivos
──────────────────────────────────────────

Tu tarea: Crear tabla devices con todas las constraints

  1. ¿Qué tipo de código? → Database
  2. Leer: DATABASE-ARCHITECT-SKILL.md
  3. Reglas clave:
     - Device MUST have user_id (FK)
     - ON DELETE CASCADE
     - Index on foreign keys
     - No orphaned records
  4. Patrón correcto (copy-paste):

     CREATE TABLE devices (
         id UUID PRIMARY KEY,
         user_id UUID NOT NULL,
         name VARCHAR(255) NOT NULL,
         device_type VARCHAR(100),
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         
         CONSTRAINT fk_devices_user_id 
             FOREIGN KEY (user_id) 
             REFERENCES users(id) 
             ON DELETE CASCADE
     );
     
     CREATE INDEX idx_devices_user_id ON devices(user_id);

  5. Checklist:
     [ ] user_id required (NOT NULL)
     [ ] Foreign key constraint
     [ ] ON DELETE CASCADE
     [ ] Index on user_id
     [ ] No orphaned records possible
     ✅ APROBADO


ESCENARIO 3: Implementar pantalla de login
──────────────────────────────────────────

Tu tarea: Crear componente de login con validación

  1. ¿Qué tipo de código? → Frontend
  2. Leer: FRONTEND-UI-SPECIALIST-SKILL.md
  3. Reglas clave:
     - Never expose secrets
     - Use httpOnly cookies OR memory storage
     - Form validation with feedback
     - Handle 401 properly
  4. Patrón correcto (copy-paste):

     export function LoginForm() {
       const [email, setEmail] = useState("");
       const [password, setPassword] = useState("");
       const [errors, setErrors] = useState({});
       const [isSubmitting, setIsSubmitting] = useState(false);

       const handleSubmit = async (e) => {
         e.preventDefault();
         setIsSubmitting(true);
         
         try {
           const response = await fetch(
             `${process.env.NEXT_PUBLIC_API_URL}/api/v2/auth/login`,
             {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ email, password }),
               credentials: "include"  // For httpOnly cookies
             }
           );

           if (!response.ok) {
             if (response.status === 401) {
               setErrors({ form: "Invalid email or password" });
             }
             return;
           }

           // Success - redirect
           window.location.href = "/dashboard";
         } finally {
           setIsSubmitting(false);
         }
       };

       return (
         <form onSubmit={handleSubmit}>
           {/* Input fields with validation */}
           <input value={email} onChange={...} />
           {errors.email && <p>{errors.email}</p>}
           
           <input type="password" value={password} onChange={...} />
           {errors.password && <p>{errors.password}</p>}
           
           {errors.form && <p className="error">{errors.form}</p>}
           
           <button type="submit" disabled={isSubmitting}>
             {isSubmitting ? "Logging in..." : "Log In"}
           </button>
         </form>
       );
     }

  5. Checklist:
     [ ] No secrets in code
     [ ] httpOnly credentials included
     [ ] Form validation works
     [ ] Error messages clear
     [ ] 401 handled properly
     ✅ APROBADO


ESCENARIO 4: Firmware ESP32 para enviar lecturas
────────────────────────────────────────────────

Tu tarea: Implement POST /devices/readings con Bearer token

  1. ¿Qué tipo de código? → ESP32 Firmware
  2. Leer: ESP32-IOT-SPECIALIST-SKILL.md
  3. Reglas clave:
     - HTTPS only (no HTTP)
     - Bearer token in Authorization header
     - Retry logic (exponential backoff)
     - Token refresh on 401
  4. Patrón correcto (copy-paste):

     void sendSensorReading(const char* token) {
       WiFiClientSecure client;
       client.setCACert(ca_cert);
       
       if (!client.connect(SERVER_HOST, SERVER_PORT)) {
         retryWithBackoff();
         return;
       }
       
       String url = "/api/v2/sensors/readings";
       String payload = "{\"mq4\":500,\"mq7\":400,\"mq135\":300}";
       
       client.println("POST " + url + " HTTP/1.1");
       client.println("Host: " + String(SERVER_HOST));
       client.println("Content-Type: application/json");
       client.println("Authorization: Bearer " + String(token));
       client.println("Content-Length: " + String(payload.length()));
       client.println("");
       client.print(payload);
       
       int statusCode = parseStatusCode(client);
       
       if (statusCode == 401) {
         refreshToken();  // Refresh on 401
         sendSensorReading(getNewToken());
       } else if (statusCode >= 500) {
         retryWithBackoff();
       }
     }

  5. Checklist:
     [ ] HTTPS (WiFiClientSecure)
     [ ] Bearer token in header
     [ ] Retry logic
     [ ] Token refresh on 401
     [ ] No HTTP
     [ ] No API keys
     ✅ APROBADO


═══════════════════════════════════════════════════════════════════════════════
🎨 FLUJO COMPLETO: De idea a producción
═══════════════════════════════════════════════════════════════════════════════

Paso 1: Tienes una idea
  "Quiero que el ESP32 envíe lecturas de sensores"

Paso 2: Identifica las skills necesarias
  ├─ Frontend: ¿Botón en la app? → FRONTEND UI SPECIALIST
  ├─ Backend: ¿Endpoint para recibir? → BACKEND REACTIVE SPECIALIST
  ├─ ESP32: ¿Firmware para enviar? → ESP32 IOT SPECIALIST
  └─ Database: ¿Guardar lecturas? → DATABASE ARCHITECT

Paso 3: Planifica con Guardian
  Lee .instructions.md → Entiende Three Sacred Rules

Paso 4: Implementa cada parte
  
  PARTE 1: Database (primero)
    1. Lee DATABASE-ARCHITECT-SKILL.md
    2. Diseña tabla sensor_readings con UNIQUE(device_id, reading_id)
    3. Usa checklist → Aprobado ✅
    4. Haz migration SQL
  
  PARTE 2: Backend endpoint (segundo)
    1. Lee BACKEND-REACTIVE-SPECIALIST-SKILL.md
    2. Crea POST /api/v2/sensors/readings
    3. Extrae deviceId del JWT
    4. Usa checklist → Aprobado ✅
    5. Escribe tests
  
  PARTE 3: Frontend (tercero)
    1. Lee FRONTEND-UI-SPECIALIST-SKILL.md
    2. Crea botón "Sync" en dashboard
    3. Maneja auth token seguro
    4. Usa checklist → Aprobado ✅
    5. Prueba en browser
  
  PARTE 4: ESP32 (cuarto)
    1. Lee ESP32-IOT-SPECIALIST-SKILL.md
    2. Implement POST con Bearer token
    3. Agrega retry logic
    4. Usa checklist → Aprobado ✅
    5. Flash y prueba

Paso 5: Code Review
  Ejecuta: bash validate-architecture.sh
  
  Si todo pasa:
    ✅ Todos los checks pasaron
    ✅ Feature ready
    ✅ Deploy a producción

Paso 6: Deploy
  git push → PR → Review → Merge → Producción


═══════════════════════════════════════════════════════════════════════════════
🔍 DÓNDE ENCONTRAR AYUDA
═══════════════════════════════════════════════════════════════════════════════

¿Necesitas...?                          Lee...
───────────────────────────────────────────────────────────────────────────────
Entender architecture general            → .instructions.md
                                         → ARCHITECTURE-GUARDIAN-GUIDE.md

Implementar backend endpoint             → BACKEND-REACTIVE-SPECIALIST-SKILL.md
                                         → BACKEND-REACTIVE-SPECIALIST-README.md

Programar firmware ESP32                 → ESP32-IOT-SPECIALIST-SKILL.md
                                         → ESP32-IOT-SPECIALIST-README.md

Diseñar base de datos                    → DATABASE-ARCHITECT-SKILL.md
                                         → DATABASE-ARCHITECT-README.md

Construir componentes React              → FRONTEND-UI-SPECIALIST-SKILL.md
                                         → FRONTEND-UI-SPECIALIST-README.md

Validar todo automáticamente             → bash validate-architecture.sh

Ver qué archivos crear                   → GUARDIAN-FILE-NAVIGATOR.md

Onboarding de equipo                     → GUARDIAN-INTEGRATION.md


═══════════════════════════════════════════════════════════════════════════════
⚡ TL;DR (RESUMEN RÁPIDO)
═══════════════════════════════════════════════════════════════════════════════

1️⃣  Identifica el tipo de código
     Backend? → BACKEND REACTIVE SPECIALIST
     ESP32?   → ESP32 IOT SPECIALIST
     DB?      → DATABASE ARCHITECT
     UI?      → FRONTEND UI SPECIALIST

2️⃣  Lee el archivo de la skill
     cat SKILL_NAME.md

3️⃣  Copia el patrón ✅ CORRECT
     (está en el archivo)

4️⃣  NO hagas lo ❌ WRONG
     (está listado en el archivo)

5️⃣  Revisa con el CHECKLIST
     Antes de hacer PR

6️⃣  Haz PR
     Incluye: "Uses [SKILL] ✅"

7️⃣  Merge cuando esté aprobado
     Deploy a producción


═══════════════════════════════════════════════════════════════════════════════

✅ Skills están LISTAS para usar

Próximos pasos:
  1. Elige qué feature implementar
  2. Identifica qué skill necesitas
  3. Lee el archivo de la skill
  4. Copia el patrón correcto
  5. Usa la checklist
  6. ¡Implementa!

¿Preguntas? Lee GUARDIAN-FILE-NAVIGATOR.md para encontrar respuestas rápidas.
