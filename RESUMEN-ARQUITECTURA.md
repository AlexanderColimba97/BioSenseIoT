╔═══════════════════════════════════════════════════════════════════════════════╗
║                     📐 ARQUITECTURA BioSenseIoT - RESUMEN                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🏗️  VISTA DE ALTO NIVEL
═══════════════════════════════════════════════════════════════════════════════

    ESP32 Device                Mobile App              Web Dashboard
    (Sensors+BLE)              (Capacitor)             (Next.js)
         ↓                          ↓                        ↓
    ┌─────────────────────────────────────────────────────────┐
    │         Spring Boot Backend (WebFlux)                  │
    │         - Autenticación (JWT)                          │
    │         - Gestión de dispositivos                      │
    │         - Procesamiento de sensores                    │
    │         - Rate limiting + Seguridad                    │
    └─────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  PostgreSQL (BD)    │
                    │  - users            │
                    │  - devices          │
                    │  - sensor_readings  │
                    └─────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
🧩 COMPONENTES
═══════════════════════════════════════════════════════════════════════════════

1. HARDWARE (ESP32-32D)
   ├── Sensores: MQ4 (metano), MQ7 (CO), MQ135 (aire)
   ├── Protocolos: WiFi 802.11, BLE 4.2, HTTPS/TLS 1.2
   ├── Comunicación: POST HTTPS cada 10 segundos
   ├── Almacenamiento: NVS (credenciales), Buffer (dedup)
   └── Tamaño: ~1.0 MB (optimizado)

2. FRONTEND (Next.js 13+)
   ├── Pages: Auth, Dashboard, Devices, Analytics
   ├── State: Zustand + Context API
   ├── Styling: Tailwind CSS
   ├── Charts: Recharts o Chart.js
   ├── Mobile: Capacitor wrapper
   └── Lenguaje: TypeScript + React 18

3. BACKEND (Spring Boot 3.4)
   ├── Framework: WebFlux (Reactive)
   ├── BD: R2DBC + PostgreSQL
   ├── Autenticación: JWT + OAuth2
   ├── API: REST /api/v2/
   ├── Deployment: Docker + Railway
   └── Lenguaje: Java 17

4. DATABASE (PostgreSQL)
   ├── Tablas: users, devices, sensor_readings, audit_logs
   ├── Constraints: UNIQUE(reading_id) para dedup
   ├── Índices: En timestamp, device_id, reading_id
   ├── Hosting: Railway.app (Managed)
   └── Backup: Automático c/24h

═══════════════════════════════════════════════════════════════════════════════
🎯 PARADIGMAS PROGRAMACIÓN
═══════════════════════════════════════════════════════════════════════════════

Backend:
├── OOP: Clases + Herencia
├── Reactive: Mono/Flux (Project Reactor)
├── Functional: map(), flatMap(), lambdas
├── Dependency Injection: Spring IoC
└── Clean Architecture: Hexagonal (Ports & Adapters)

Frontend:
├── Components: React (declarativo)
├── Hooks: useState, useEffect, custom hooks
├── Async: Promises + async/await
├── TypeScript: Type-safe
└── State Management: Zustand

Hardware:
├── Procedural: C++ (setup + loop)
├── State Machine: Estados + transiciones
├── Event-driven: Interrupts + callbacks
├── Low-level: GPIO, ADC directo
└── Embedded: Control de recursos

═══════════════════════════════════════════════════════════════════════════════
✅ PRINCIPIOS SOLID
═══════════════════════════════════════════════════════════════════════════════

S - Single Responsibility
  ├─ UserService: Solo usuarios
  ├─ DeviceService: Solo dispositivos
  ├─ SensorService: Solo sensores
  └─ Cada clase: UNA razón para cambiar

O - Open/Closed
  ├─ Abierto: Agregar RepositoryPort (MongoDB, etc)
  ├─ Cerrado: No modificar UserRepository existente
  └─ Extensión sin modificación

L - Liskov Substitution
  ├─ PostgresUserRepository ≈ InMemoryUserRepository
  ├─ Intercambiables sin romper código
  └─ Mismas garantías (contrato respetado)

I - Interface Segregation
  ├─ UserRepositoryPort (solo user methods)
  ├─ DeviceRepositoryPort (solo device methods)
  └─ No interfaces gigantes con todo

D - Dependency Inversion
  ├─ Service depends on RepositoryPort (interface)
  ├─ NO depends on PostgresRepository (concreto)
  └─ Inversión: Abstracciones, no implementaciones

═══════════════════════════════════════════════════════════════════════════════
🔌 PATRONES DISEÑO
═══════════════════════════════════════════════════════════════════════════════

1. Repository Pattern       → BD abstraction
2. Service Pattern          → Use cases/business logic
3. Dependency Injection     → Loose coupling
4. Adapter Pattern          → JWT, HTTP abstraction
5. Reactive Streams         → Mono<T>, Flux<T>
6. Strategy Pattern         → Auth strategies (JWT vs OAuth)
7. Factory Pattern          → TokenFactory
8. Decorator Pattern        → @Transactional, @Cacheable
9. Observer Pattern         → Spring Events
10. Chain of Responsibility → Security filter chain
11. Builder Pattern         → AuthResponse.builder()
12. Singleton Pattern       → Spring beans

═══════════════════════════════════════════════════════════════════════════════
📊 FLUJO DE DATOS (End-to-End)
═══════════════════════════════════════════════════════════════════════════════

PASO 1: Autenticación
───────────────────
User App → POST /api/v2/auth/login
           ├─ Valida email + password
           ├─ Genera JWT (1h) + Refresh (24h)
           └─ Response: token + userData

PASO 2: Registrar Dispositivo
──────────────────────────────
User App → POST /api/v2/devices/register
           ├─ Backend genera deviceId + deviceSecret
           ├─ DB: Inserta en tabla devices
           └─ Response: deviceId + deviceSecret

PASO 3: Provisioning vía BLE
────────────────────────────
User App → Envía vía BLE (cifrado)
           ├─ WiFi SSID
           ├─ WiFi password
           ├─ deviceId
           └─ deviceSecret

           ESP32 → Guarda en NVS (cifrado)

PASO 4: Activación de Dispositivo
──────────────────────────────────
ESP32 → POST /devices/activate
        ├─ Body: deviceId + deviceSecret
        ├─ Backend: Valida + genera Device JWT (12h)
        └─ Response: token

PASO 5: Envío de Lecturas (Loop cada 10s)
──────────────────────────────────────────
ESP32 Sensor Read
  ↓
Generar readingId (UUID)
  ↓
Verificar no está en buffer (dedup local)
  ↓
Construir JSON: { macAddress, deviceId, mq4, mq7, mq135, readingId, timestamp }
  ↓
POST /api/v2/sensors/reading
  ├─ Header: Authorization: Bearer deviceToken
  ├─ Backend: Valida JWT + schema + UNIQUE(reading_id)
  ├─ DB: INSERT en sensor_readings
  └─ Response: 200 OK / 409 CONFLICT (duplicado)

PASO 6: Frontend recibe datos
────────────────────────────
GET /api/v2/sensors/readings/deviceId
  ├─ Backend: SELECT * FROM sensor_readings WHERE device_id = ?
  ├─ Response: [ { mq4, mq7, mq135, timestamp, ... } ]
  └─ Frontend: Renderiza en gráfico

═══════════════════════════════════════════════════════════════════════════════
🗄️  BASE DE DATOS
═══════════════════════════════════════════════════════════════════════════════

Tablas principales:

users
├── id (UUID)
├── email (UNIQUE)
├── password_hash (bcrypt)
└── full_name

devices
├── id (UUID)
├── user_id (FK → users)
├── device_id (UNIQUE)
├── mac_address (UNIQUE)
├── device_secret_hash (bcrypt)
└── status (ACTIVE/INACTIVE)

sensor_readings
├── id (UUID)
├── device_id (FK → devices)
├── reading_id (UNIQUE) ← Deduplicación!
├── mq4_ppm
├── mq7_ppm
├── mq135_ppm
├── timestamp
└── INDEX: (device_id, timestamp DESC)

audit_logs
├── id (UUID)
├── user_id (FK)
├── action (LOGIN/REGISTER/SYNC)
├── timestamp
└── INDEX: (user_id, timestamp DESC)

═══════════════════════════════════════════════════════════════════════════════
🚀 DESPLIEGUE
═══════════════════════════════════════════════════════════════════════════════

DESARROLLO (Local)
─────────────────
docker-compose up -d
├── Backend: localhost:8080
├── PostgreSQL: localhost:5432
└── PgAdmin: localhost:5050

PRODUCCIÓN (Railway.app)
────────────────────────
Git push → GitHub
   ↓
GitHub Actions
   ├─ mvn clean package
   ├─ docker build
   └─ push to Railway
   ↓
Railway auto-deploy
   ├─ Backend container
   ├─ PostgreSQL managed
   ├─ Auto-scaling 1-3 instancias
   ├─ Health checks
   └─ Rolling deployments

MONITOREO
─────────
├── Logs: Railway console (real-time)
├── Métricas: /actuator/metrics
├── Health: GET /actuator/health
├── Alerts: Email si falla

═══════════════════════════════════════════════════════════════════════════════
🔐 SEGURIDAD
═══════════════════════════════════════════════════════════════════════════════

Autenticación:
├── User: JWT (email:password)
├── Device: Device JWT (deviceId:deviceSecret)
└── OAuth: Google Auth (opcional)

Autorización:
├── User: @Secured("ROLE_USER")
├── Resource-based: Solo propietario ve datos
└── Device: Solo su propio deviceId

Encriptación:
├── En tránsito: HTTPS/TLS 1.2
├── En reposo: bcrypt (passwords), JWT (tokens)
└── BLE: AES-256-GCM (futuro)

Protección:
├── Rate limiting: 100 req/min por dispositivo
├── CSRF: CSRF tokens + SameSite
├── SQL Injection: Prepared statements (R2DBC)
├── XSS: DOMPurify (frontend)
├── Timing attacks: constantTimeEquals()
└── CORS: Dominios permitidos

Estado: ✅ 65% + Seguridad (3 críticas + 3 mejoras)

═══════════════════════════════════════════════════════════════════════════════
📈 ESCALABILIDAD
═══════════════════════════════════════════════════════════════════════════════

Horizontal:
├── Backend: Multi-instancia (1-3 en Railway)
├── Database: Master-Slave replication
├── Frontend: CDN global (Vercel)
└── Load Balancer: Automático en Railway

Vertical:
├── Memory: 512MB-2GB (configurable)
├── CPU: Auto-scaling según carga
├── DB connections: HikariCP (10 pool)
└── Cache: Redis (opcional para rate limit)

Performance:
├── Queries: Índices en timestamp + device_id
├── Caching: Response headers + Redis
├── Compression: gzip en responses
├── Database: Connection pooling
└── Frontend: Lazy loading + code splitting

Capacidad:
├── Usuarios: Ilimitado (schema relacional)
├── Dispositivos: 10k+ por usuario
├── Lecturas: 100k+ por día sin problema
├── Concurrencia: WebFlux maneja 10k+ conexiones
└── Uptime: 99.9% SLA (Railway)

═══════════════════════════════════════════════════════════════════════════════
✨ DECISIONES CLAVE
═══════════════════════════════════════════════════════════════════════════════

✅ Spring Boot WebFlux (vs MVC)          → Reactive, escalable
✅ PostgreSQL (vs MongoDB)               → ACID, transacciones
✅ Hexagonal Architecture (vs MVC 3-layer) → Testeable, mantenible
✅ JWT (vs Session-based)                → Stateless, distribuido
✅ Next.js (vs Vue/Angular)              → Full-stack integrado
✅ Capacitor (vs React Native)           → Code sharing
✅ BLE Provisioning (vs QR codes)        → Seguridad, interactivo
✅ HTTPS ESP32 (vs HTTP)                 → Encriptación, TLS 1.2

═══════════════════════════════════════════════════════════════════════════════

Documento: Resumen Arquitectura BioSenseIoT
Versión: 2.1
Última actualización: 2024-04-20

Para documentación detallada, ver: ARQUITECTURA-COMPLETA.md
