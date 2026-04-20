╔═══════════════════════════════════════════════════════════════════════════════╗
║           🏗️  BioSenseIoT - Arquitectura Completa de Ingeniería             ║
║                 Estructura | Paradigmas | Principios SOLID                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📋 TABLA DE CONTENIDOS
═══════════════════════════════════════════════════════════════════════════════

1. Resumen Ejecutivo
2. Estructura del Proyecto
3. Arquitectura de Capas
4. Componentes del Sistema
5. Paradigmas de Programación
6. Principios SOLID
7. Patrones de Diseño
8. Flujo de Datos
9. Base de Datos
10. Despliegue e Infraestructura
11. Seguridad
12. Decisiones Arquitectónicas

═══════════════════════════════════════════════════════════════════════════════
1️⃣  RESUMEN EJECUTIVO
═══════════════════════════════════════════════════════════════════════════════

BioSenseIoT es un sistema IoT empresarial de monitoreo de calidad de aire
interior en tiempo real con arquitectura distribuida de tres capas:

┌─────────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA DE ALTO NIVEL                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ESP32 Device          Mobile App          Web Dashboard               │
│  (Sensors + BLE)   →   (Capacitor)    →   (Next.js)                   │
│                              ↓                   ↓                      │
│                        ┌─────────────────────────┐                      │
│                        │   Spring Boot Backend   │                      │
│                        │   (WebFlux - Reactive) │                      │
│                        │   Railway Cloud        │                      │
│                        └─────────────────────────┘                      │
│                                   ↓                                     │
│                        ┌─────────────────────────┐                      │
│                        │   PostgreSQL Database  │                      │
│                        │   (Railway Managed)    │                      │
│                        └─────────────────────────┘                      │
│                                                                         │
│  Estado: ✅ Production-Ready, ✅ Seguridad 65%+, ✅ Escalable         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
2️⃣  ESTRUCTURA DEL PROYECTO
═══════════════════════════════════════════════════════════════════════════════

BioSenseIoT/
├── 📁 backend/                          # Spring Boot Backend (Java)
│   ├── src/main/java/com/biosense/iot/
│   │   ├── auth/                        # Módulo Autenticación
│   │   │   ├── domain/                  # Entidades de dominio
│   │   │   ├── application/             # Casos de uso (Use Cases)
│   │   │   ├── infrastructure/          # Adaptadores (Controllers, DB)
│   │   │   └── port/in+out/             # Interfaces Hexagonal
│   │   │
│   │   ├── device/                      # Módulo Dispositivos
│   │   │   ├── domain/DeviceEntity
│   │   │   ├── controller/DeviceController
│   │   │   ├── service/DeviceService
│   │   │   └── repository/DeviceRepository
│   │   │
│   │   ├── sensor/                      # Módulo Sensores
│   │   │   ├── domain/SensorReading
│   │   │   ├── controller/SensorController
│   │   │   ├── service/SensorService
│   │   │   └── repository/SensorRepository
│   │   │
│   │   ├── dto/                         # Data Transfer Objects
│   │   ├── config/                      # Configuración Spring
│   │   ├── security/                    # JWT, seguridad
│   │   └── exception/                   # Manejo de excepciones
│   │
│   ├── src/main/resources/
│   │   ├── application.yml              # Configuración principal
│   │   ├── application-dev.yml
│   │   ├── application-prod.yml
│   │   └── db/migration/                # Migraciones Flyway
│   │
│   ├── pom.xml                          # Dependencias Maven
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── 📁 frontend/                         # Next.js Frontend
│   ├── src/
│   │   ├── app/                         # App Router (Next.js 13+)
│   │   │   ├── (auth)/                  # Rutas autenticadas
│   │   │   ├── (dashboard)/             # Rutas dashboard
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   ├── widgets/
│   │   │   └── common/
│   │   ├── hooks/                       # React Hooks personalizados
│   │   ├── services/                    # API Client
│   │   ├── store/                       # Zustand/Redux state
│   │   ├── types/                       # TypeScript types
│   │   └── utils/
│   ├── mobile/                          # Capacitor Mobile
│   │   ├── src/
│   │   ├── ios/
│   │   └── android/
│   ├── package.json
│   └── tsconfig.json
│
├── 📁 hardware/                         # Firmware ESP32
│   ├── esp32_biosense/
│   │   ├── biosense_esp32_SECURE.ino    # Firmware principal (C++)
│   │   ├── libraries/                   # Librerías personalizadas
│   │   └── pins_config.h
│   └── documentation/
│
├── 📁 database/                         # Esquema y migraciones
│   ├── migrations/
│   │   ├── V1__initial_schema.sql
│   │   ├── V2__add_security.sql
│   │   └── V3__add_indexes.sql
│   └── schema.sql
│
├── 📁 docs/                             # Documentación
│   ├── API.md                           # OpenAPI/Swagger
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
│
├── docker-compose.yml                  # Orquestación local
├── .github/workflows/                   # GitHub Actions CI/CD
├── Dockerfile                           # Contenedor Backend
└── README.md

═══════════════════════════════════════════════════════════════════════════════
3️⃣  ARQUITECTURA DE CAPAS
═══════════════════════════════════════════════════════════════════════════════

BACKEND - Spring Boot WebFlux (Arquitectura Hexagonal/Clean)

┌────────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (Controllers)                                          │
│ ├── @RestController                                                       │
│ ├── AuthControllerV2.java     → /api/v2/auth                             │
│ ├── DeviceController.java      → /api/v2/devices                          │
│ └── SensorController.java      → /api/v2/sensors/reading                  │
├────────────────────────────────────────────────────────────────────────────┤
│ APPLICATION LAYER (Use Cases/Services)                                    │
│ ├── LoginUseCase.java          → Ejecuta lógica de login                  │
│ ├── RegisterUseCase.java       → Ejecuta lógica de registro               │
│ ├── DeviceRegistrationUseCase  → Registra dispositivos                    │
│ └── SensorReadingUseCase       → Procesa lecturas de sensores             │
├────────────────────────────────────────────────────────────────────────────┤
│ DOMAIN LAYER (Entidades, Excepciones, Interfaces)                        │
│ ├── User (Agregado)            → Usuario del sistema                      │
│ ├── Device (Agregado)          → Dispositivo IoT                          │
│ ├── SensorReading (Value Obj)  → Lectura de sensor                        │
│ └── RepositoryPort (Interface)  → Abstracción de persistencia             │
├────────────────────────────────────────────────────────────────────────────┤
│ INFRASTRUCTURE LAYER (BD, Adaptadores, Config)                           │
│ ├── PostgresUserRepository     → Implementa UserRepositoryPort           │
│ ├── PostgresDeviceRepository   → Implementa DeviceRepositoryPort         │
│ ├── R2dbcConfig                → Configuración reactiva                   │
│ ├── JwtSecurityConfig          → Configuración de seguridad               │
│ └── JwtAdapter                 → Manejo de tokens JWT                     │
└────────────────────────────────────────────────────────────────────────────┘

PARADIGMA: Clean Architecture + Hexagonal Architecture (Ports & Adapters)

FRONTEND - Next.js 13+ (App Router)

┌────────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (Pages/Components)                                     │
│ ├── /app/(auth)/login          → Componente Login                         │
│ ├── /app/(dashboard)/           → Dashboard principal                     │
│ └── /components/                → Componentes reutilizables               │
├────────────────────────────────────────────────────────────────────────────┤
│ STATE MANAGEMENT LAYER (Zustand/Context API)                             │
│ ├── useAuthStore               → Estado global de autenticación           │
│ ├── useSensorStore             → Estado de lecturas de sensores           │
│ └── useDeviceStore             → Estado de dispositivos                   │
├────────────────────────────────────────────────────────────────────────────┤
│ SERVICE LAYER (API Client)                                                │
│ ├── authService.ts             → Llama /api/v2/auth                       │
│ ├── deviceService.ts           → Llama /api/v2/devices                    │
│ ├── sensorService.ts           → Llama /api/v2/sensors                    │
│ └── apiClient.ts               → HTTP client con interceptores             │
├────────────────────────────────────────────────────────────────────────────┤
│ HOOKS LAYER (Lógica reutilizable)                                         │
│ ├── useAuth()                  → Lógica de autenticación                  │
│ ├── useSensors()               → Lógica de sensores                       │
│ └── useDeviceSync()            → Lógica de sincronización                 │
└────────────────────────────────────────────────────────────────────────────┘

PARADIGMA: Component-based + Hooks (React moderno)

HARDWARE - ESP32 Firmware (C++)

┌────────────────────────────────────────────────────────────────────────────┐
│ MAIN APPLICATION (biosense_esp32_SECURE.ino)                             │
│ ├── Configuration & Initialization                                        │
│ ├── WiFi Management                    → Conexión a internet              │
│ ├── BLE Provisioning                   → Recepción de credenciales        │
│ ├── Sensor Reading                     → Lectura de MQ4/MQ7/MQ135        │
│ ├── HTTPS Communication                → POST a /api/v2/sensors/reading   │
│ ├── Local Deduplication                → Buffer circular de IDs           │
│ ├── LED Status Indicators              → RGB LEDs de estado               │
│ └── Error Handling & Recovery          → Reconexión automática            │
└────────────────────────────────────────────────────────────────────────────┘

PARADIGMA: Procedural con state machine (típico de embedded systems)

═══════════════════════════════════════════════════════════════════════════════
4️⃣  COMPONENTES DEL SISTEMA
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│ 1. ESP32 DEVICE (Hardware + Firmware)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ Responsabilidades:                                                      │
│ • Capturar datos de sensores (MQ4, MQ7, MQ135)                         │
│ • Conectar a WiFi                                                       │
│ • Comunicarse vía HTTPS con backend                                     │
│ • Provisionar credenciales vía BLE                                      │
│ • Deduplicar lecturas localmente                                        │
│                                                                         │
│ Tecnología:                                                             │
│ • Microcontrolador: Espressif ESP32-32D N4                             │
│ • Lenguaje: C++ (Arduino IDE compatible)                               │
│ • Protocolos: WiFi 802.11b/g/n, BLE 4.2, HTTPS (TLS 1.2)             │
│ • Sensores: MQ4 (Metano), MQ7 (CO), MQ135 (Aire)                      │
│                                                                         │
│ Endpoints consumidos:                                                   │
│ • POST /devices/activate                                                │
│ • POST /api/v2/sensors/reading                                          │
│ • GET /devices/refresh-token                                            │
│                                                                         │
│ Almacenamiento:                                                         │
│ • NVS (Non-Volatile Storage): Credenciales + Configuración              │
│ • Buffer circular: Deduplicación local de lecturas                      │
│ • Flash: Firmware (1-3 MB)                                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 2. MOBILE APP (Capacitor + React/Vue)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Responsabilidades:                                                      │
│ • Login/Registro de usuario                                             │
│ • Registrar nuevo dispositivo                                           │
│ • Provisionar credenciales vía BLE al ESP32                             │
│ • Mostrar estado en tiempo real                                         │
│ • Sincronizar datos con servidor                                        │
│                                                                         │
│ Tecnología:                                                             │
│ • Framework: Capacitor + React/Vue                                      │
│ • Protocolos: HTTPS (API client), BLE (provisioning)                   │
│ • Almacenamiento: LocalStorage + SQLite (Capacitor Storage Plugin)     │
│                                                                         │
│ Endpoints consumidos:                                                   │
│ • POST /api/v2/auth/login                                               │
│ • POST /api/v2/auth/register                                            │
│ • POST /api/v2/devices/register                                         │
│ • GET /api/v2/devices                                                   │
│ • GET /api/v2/sensors/readings/{deviceId}                              │
│                                                                         │
│ Acceso BLE:                                                             │
│ • UUID Service: 4fafc201-1fb5-459e-8fcc-c5c9c331914b                  │
│ • UUID Char: beb5483e-36e1-4688-b7f5-ea07361b26a8                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 3. BACKEND API (Spring Boot WebFlux)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ Responsabilidades:                                                      │
│ • Autenticar usuarios (JWT)                                             │
│ • Autenticar dispositivos (Bearer Token)                                │
│ • Registrar y gestionar dispositivos                                    │
│ • Recibir lecturas de sensores                                          │
│ • Deduplicar datos en BD                                                │
│ • Rate limiting y protección                                            │
│ • Servir API REST para frontend/mobile                                  │
│                                                                         │
│ Tecnología:                                                             │
│ • Framework: Spring Boot 3.4 + WebFlux (Reactor)                       │
│ • BD: R2DBC + PostgreSQL (Reactive)                                     │
│ • Autenticación: JWT (jjwt 0.12.5) + Spring Security                   │
│ • Validación: Jakarta Bean Validation                                   │
│ • Migraciones: Flyway                                                   │
│                                                                         │
│ Endpoints principales:                                                  │
│ POST   /api/v2/auth/login              → Login usuario                  │
│ POST   /api/v2/auth/register           → Registro usuario               │
│ POST   /api/v2/auth/google             → OAuth Google                   │
│ POST   /api/v2/auth/refresh            → Refresh token                  │
│ POST   /api/v2/devices/register        → Registrar dispositivo          │
│ POST   /api/v2/devices/activate        → Activar dispositivo            │
│ GET    /api/v2/devices                 → Listar dispositivos            │
│ POST   /api/v2/sensors/reading         → Guardar lectura               │
│ GET    /api/v2/sensors/readings/{id}   → Obtener histórico             │
│                                                                         │
│ Autenticación:                                                          │
│ • Usuarios: JWT Bearer Token (acceso + refresh)                         │
│ • Dispositivos: Device JWT Bearer Token                                 │
│ • Comparación timing-safe de secretos                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 4. DASHBOARD WEB (Next.js 13+)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Responsabilidades:                                                      │
│ • Mostrar datos en tiempo real                                          │
│ • Gráficos históricos                                                   │
│ • Gestión de dispositivos                                               │
│ • Alertas de calidad de aire                                            │
│                                                                         │
│ Tecnología:                                                             │
│ • Framework: Next.js 13+ (App Router)                                   │
│ • Librerías: React 18, TypeScript, Tailwind CSS                         │
│ • Gráficos: Chart.js o Recharts                                         │
│ • State: Zustand o Context API                                          │
│                                                                         │
│ Rutas:                                                                  │
│ /                              → Landing page                           │
│ /auth/login                    → Login                                  │
│ /dashboard                     → Dashboard principal                    │
│ /devices                       → Gestión de dispositivos                │
│ /analytics                     → Análisis de datos                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 5. DATABASE (PostgreSQL)                                                │
├─────────────────────────────────────────────────────────────────────────┤
│ Tablas principales:                                                     │
│ • users                 → Usuarios del sistema                          │
│ • devices              → Dispositivos registrados                       │
│ • sensor_readings      → Lecturas de sensores (histórico)              │
│ • device_secrets       → Secretos de dispositivos (cifrados)            │
│ • audit_logs           → Logs de acceso/cambios                        │
│                                                                         │
│ Constraints:                                                            │
│ • reading_id UNIQUE    → Deduplicación                                  │
│ • timestamp INDEX      → Queries rápidas                                │
│ • device_id FOREIGN KEY → Integridad referencial                       │
│ • user_id FOREIGN KEY  → Relación usuario-dispositivo                  │
│                                                                         │
│ Hospedaje: Railway.app (Managed PostgreSQL)                             │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
5️⃣  PARADIGMAS DE PROGRAMACIÓN
═══════════════════════════════════════════════════════════════════════════════

BACKEND:

1. ✅ Programación Orientada a Objetos (OOP)
   ├── Clases de Dominio (User, Device, SensorReading)
   ├── Encapsulación: Atributos privados + getters/setters
   ├── Herencia: Usar dónde aplique (excepciones, abstracts)
   └── Polimorfismo: Repository pattern

2. ✅ Programación Reactiva (Reactive Programming)
   ├── Spring WebFlux: Mono<T> y Flux<T> (Project Reactor)
   ├── Non-blocking I/O
   ├── Composición de operaciones asincrónicas
   └── Manejo eficiente de conexiones

3. ✅ Programación Funcional
   ├── map(), flatMap(), filter() en Mono/Flux
   ├── Method references (::)
   ├── Lambdas para callbacks
   └── Operaciones encadenadas (fluent API)

4. ✅ Inyección de Dependencias (DI)
   ├── Spring Framework: @Autowired, @Component, @Service
   ├── Constructor injection (preferred)
   ├── Inversión de control (IoC)
   └── Singleton pattern para servicios

5. ✅ Arquitectura Hexagonal (Ports & Adapters)
   ├── Domain Layer (independiente de framework)
   ├── Ports (Interfaces): UserRepositoryPort, AuthPort
   ├── Adapters (Implementaciones): PostgresUserRepository
   └── Isolation de la lógica de negocio

FRONTEND:

1. ✅ Componentes React (Declarativo)
   ├── Functional Components
   ├── JSX para UI
   ├── Props para comunicación
   └── State mediante hooks

2. ✅ Hooks (React)
   ├── useState() para estado local
   ├── useEffect() para side effects
   ├── useContext() para estado global
   └── Hooks personalizados (useAuth, useSensors)

3. ✅ Programación Asincrónica
   ├── Promises en API calls
   ├── async/await para mejor legibilidad
   ├── Error handling con try/catch
   └── Retry logic

4. ✅ TypeScript (Tipado Estático)
   ├── Interfaces para DTOs
   ├── Generics para componentes reutilizables
   ├── Type safety en compilación
   └── IDE autocompletion mejorada

5. ✅ State Management
   ├── Zustand: Ligero y simple
   ├── Context API: Para temas, autenticación
   ├── Server state (React Query/SWR): Cacheo de datos
   └── Local state: useState para componentes

HARDWARE:

1. ✅ Programación Procedural (C++)
   ├── Función main() equivalente en setup() + loop()
   ├── Ejecución secuencial con interrupciones
   ├── Control de bajo nivel (pines GPIO, ADC)
   └── Gestión manual de memoria (con cuidado)

2. ✅ State Machine (Máquina de Estados)
   ├── Estados: IDLE, CONNECTING, READING, SENDING
   ├── Transiciones basadas en eventos
   ├── Timeouts para reconexión
   └── Recovery automático

3. ✅ Event-Driven
   ├── Interrupciones de temporizador (interrupts)
   ├── Callbacks de BLE
   ├── Eventos de WiFi
   └── Eventos de sensores

═══════════════════════════════════════════════════════════════════════════════
6️⃣  PRINCIPIOS SOLID
═══════════════════════════════════════════════════════════════════════════════

S - Single Responsibility Principle (SRP)
──────────────────────────────────────────

✅ Implementado:

Backend:
├── UserService: Solo gestiona usuarios
├── DeviceService: Solo gestiona dispositivos
├── SensorService: Solo procesa lecturas
├── JwtAdapter: Solo maneja JWT
└── PostgresUserRepository: Solo accede a usuarios en BD

Cada clase tiene UNA razón para cambiar.

❌ Evitar:
UserDeviceSensorService (hace todo)


O - Open/Closed Principle (OCP)
────────────────────────────────

✅ Implementado:

Abierto para extensión:
├── RepositoryPort interface → Nuevas implementaciones
├── AuthenticationService → Puede agregar OAuth, 2FA
└── SensorProcessor → Puede procesar diferentes tipos

Cerrado para modificación:
├── Domain Layer: Cambia solo si requiere cambio de negocio
├── Use Cases: Lógica estable
└── No tocamos código existente, solo extendemos

❌ Evitar:
Modificar UserRepository.java cuando queremos soportar MongoDB


L - Liskov Substitution Principle (LSP)
─────────────────────────────────────────

✅ Implementado:

Todas las implementaciones de RepositoryPort pueden reemplazarse:
├── PostgresUserRepository implements UserRepositoryPort
├── InMemoryUserRepository implements UserRepositoryPort (para tests)
└── MockUserRepository implements UserRepositoryPort (para testing)

Subtipos intercambiables sin romper el comportamiento.

❌ Evitar:
Que PostgresUserRepository tenga métodos que InMemoryUserRepository no tenga


I - Interface Segregation Principle (ISP)
────────────────────────────────────────────

✅ Implementado:

Interfaces pequeñas y específicas:
├── UserRepositoryPort (solo métodos de usuario)
├── DeviceRepositoryPort (solo métodos de dispositivo)
├── AuthenticationPort (solo métodos de auth)
└── No interfaces gigantes con métodos no usados

Cliente usa solo lo que necesita.

❌ Evitar:
interface CrudRepository<T> extends Repository, Finder, Writer, Deleter, etc.


D - Dependency Inversion Principle (DIP)
───────────────────────────────────────────

✅ Implementado:

Depender de abstracciones, no de implementaciones concretas:

Correcto:
├── AuthService depends on UserRepositoryPort (interface)
├── UserService depends on JwtAdapter (abstracción)
└── @Autowired private UserRepositoryPort userRepo; // interface

Incorrecto:
├── AuthService depends on PostgresUserRepository (concreto)
└── new PostgresUserRepository() // acoplamiento

Beneficio: Cambiar BD de Postgres a MongoDB sin tocar servicios.

═══════════════════════════════════════════════════════════════════════════════
7️⃣  PATRONES DE DISEÑO
═══════════════════════════════════════════════════════════════════════════════

PATRONES IMPLEMENTADOS:

1. Repository Pattern
   ├── UserRepositoryPort (interface)
   ├── PostgresUserRepository (implementación)
   ├── Abstrae acceso a BD
   └── Facilita testing con mocks

2. Service Pattern (Use Case Pattern)
   ├── LoginUseCase.java
   ├── RegisterUseCase.java
   ├── Contiene lógica de negocio
   └── Reutilizable en múltiples controllers

3. Dependency Injection
   ├── Spring manage beans
   ├── Constructor injection
   ├── Loose coupling
   └── Fácil testing

4. Adapter Pattern
   ├── JwtAdapter: Abstrae librerías JWT
   ├── WebClientAdapter: Abstrae HTTP calls
   └── Cambia implementación sin afectar clientes

5. Reactive Streams Pattern
   ├── Mono<T>: 0 o 1 elemento
   ├── Flux<T>: 0 a N elementos
   ├── Operadores: map, filter, flatMap
   └── Non-blocking I/O

6. Strategy Pattern
   ├── AuthenticationStrategy (JWT vs OAuth)
   ├── EncryptionStrategy (AES vs RSA)
   ├── Cambia algoritmo sin cambiar contexto
   └── Extensible a nuevas estrategias

7. Factory Pattern
   ├── TokenFactory para generar tokens
   ├── SensorReadingFactory para crear lecturas
   └── Centraliza creación de objetos

8. Decorator Pattern
   ├── @Transactional: Agrega transaccionalidad
   ├── @Cacheable: Agrega caché
   ├── @Retry: Agrega reintentos
   └── Comportamiento dinámico

9. Observer Pattern
   ├── Spring Events: AuthenticationEvent
   ├── Listeners: NotificationListener
   ├── Desacoplamiento de componentes
   └── Reacción a eventos

10. Chain of Responsibility
    ├── Filter chain de seguridad
    ├── Middleware de validación
    ├── Cada eslabón procesa y pasa
    └── Configurable y modular

11. Builder Pattern
    ├── AuthResponse.builder()
    ├── Query builders para BD
    ├── Construcción paso a paso
    └── Interfaz fluida

12. Singleton Pattern
    ├── Spring beans: @Bean
    ├── Instancia única compartida
    ├── Thread-safe
    └── Control centralizado

═══════════════════════════════════════════════════════════════════════════════
8️⃣  FLUJO DE DATOS (End-to-End)
═══════════════════════════════════════════════════════════════════════════════

FLUJO 1: PROVISIONING Y AUTENTICACIÓN DE DISPOSITIVO
─────────────────────────────────────────────────────

1. Usuario abre App Mobile
   └─→ POST /api/v2/auth/login
       ├─ Body: { email, password }
       ├─ Backend: Valida + genera JWT
       └─ Response: { accessToken, refreshToken }

2. User presiona "Registrar Dispositivo"
   └─→ POST /api/v2/devices/register
       ├─ Header: Authorization: Bearer JWT
       ├─ Backend: Crea Device + genera deviceSecret
       ├─ DB: Inserta en tabla 'devices'
       └─ Response: { deviceId, deviceSecret }

3. App envía credenciales a ESP32 vía BLE (cifrado)
   ├─ BLE Char Data: encryptedPayload
   ├─ ESP32 recibe: WiFi SSID + Password + deviceSecret
   └─ NVS Store: Guarda credenciales (cifradas)

4. ESP32 se conecta a WiFi y activa backend
   └─→ POST /devices/activate
       ├─ Body: { deviceId, deviceSecret }
       ├─ Header: Authorization: Basic (Base64)
       ├─ Backend: Valida con timing-safe compare
       ├─ Genera: Device JWT Token (1h expiration)
       └─ Response: { token: "jwt..." }

5. ESP32 guarda token en memoria
   └─ Loop: Cada 10s envía lecturas con Bearer token


FLUJO 2: LECTURA Y ENVÍO DE DATOS DE SENSORES
──────────────────────────────────────────────

ESP32 Loop (10 segundos):

1. Leer sensores ADC
   ├─ Valor MQ4 (GPIO 35)
   ├─ Valor MQ7 (GPIO 34)
   └─ Valor MQ135 (GPIO 32)

2. Convertir valores a PPM
   ├─ Fórmula: PPM = A * (Rs/R0)^B
   ├─ Aplicar calibración
   └─ Redondear a 2 decimales

3. Generar readingId único
   ├─ Format: macAddress-timestamp-random
   └─ UUID para deduplicación

4. Verificar no está en buffer local
   ├─ Buscar readingId en último 100 lecturas
   └─ Si existe: skip (ya enviada)

5. Construir JSON payload
   ```json
   {
     "macAddress": "AA:BB:CC:DD:EE:FF",
     "deviceId": "AA:BB:CC:DD:EE:FF",
     "mq4": 25.34,
     "mq7": 12.56,
     "mq135": 45.78,
     "readingId": "uuid-123",
     "timestamp": 1713607260
   }
   ```

6. POST /api/v2/sensors/reading
   ├─ Header: Authorization: Bearer deviceToken
   ├─ Header: Content-Type: application/json
   └─ Body: JSON payload (arriba)

7. Backend procesa
   ├─ Validar token JWT
   ├─ Extraer deviceId de token
   ├─ Validar JSON schema
   ├─ Validar rangos de valores
   ├─ Verificar UNIQUE(reading_id) en BD
   ├─ Insertar en sensor_readings
   ├─ Aplicar rate limiting
   └─ Response: 200 OK o 409 CONFLICT (duplicado)

8. ESP32 recibe respuesta
   ├─ 200: Marca como sent en buffer
   ├─ 409: Ya existe (dedup funcionando)
   ├─ 401: Token expirado → reactivar
   ├─ 429: Rate limit → esperar
   └─ -1: Error conexión → reconectar WiFi

9. Frontend recibe datos
   └─→ GET /api/v2/sensors/readings/deviceId
       ├─ Backend query: SELECT * FROM sensor_readings WHERE device_id = ? ORDER BY timestamp DESC
       ├─ Retorna últimas 100 lecturas
       └─ Frontend: Dibuja gráfico en tiempo real


FLUJO 3: DASHBOARD EN TIEMPO REAL
──────────────────────────────────

1. Usuario accede: https://biosenseiot.com/dashboard

2. Frontend (Next.js) carga
   ├─ SSR o CSR según configuración
   ├─ Verificar JWT token en localStorage
   └─ Si expirado: refresh token

3. Frontend solicita datos
   └─→ GET /api/v2/sensors/readings?deviceId=...&limit=100
       └─ Backend retorna últimas lecturas

4. Renderizar componentes
   ├─ Chart.js/Recharts dibuja gráfico
   ├─ Actualizar cada 5 segundos (polling o WebSocket)
   └─ Mostrar estado actual y alertas

5. WebSocket (opcional para real-time)
   ├─ Conexión: ws://backend/sensors/stream
   ├─ Suscribirse a device
   └─ Recibir updates sin polling

═══════════════════════════════════════════════════════════════════════════════
9️⃣  MODELO DE BASE DE DATOS
═══════════════════════════════════════════════════════════════════════════════

ESQUEMA PRINCIPAL:

users
├── id (UUID PRIMARY KEY)
├── email (VARCHAR UNIQUE)
├── password_hash (VARCHAR)
├── full_name (VARCHAR)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── INDEX on email

devices
├── id (UUID PRIMARY KEY)
├── user_id (UUID FOREIGN KEY → users.id)
├── device_id (VARCHAR UNIQUE)
├── mac_address (VARCHAR UNIQUE)
├── device_secret_hash (VARCHAR - bcrypt)
├── device_token (VARCHAR - JWT, temporal)
├── status (ENUM: ACTIVE, INACTIVE, PAIRED)
├── is_paired (BOOLEAN)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── INDEX on user_id, device_id

sensor_readings
├── id (UUID PRIMARY KEY)
├── device_id (UUID FOREIGN KEY → devices.id)
├── reading_id (VARCHAR UNIQUE)  ← Deduplicación!
├── mq4_ppm (FLOAT)
├── mq7_ppm (FLOAT)
├── mq135_ppm (FLOAT)
├── risk_level (ENUM: SAFE, WARNING, DANGER)
├── timestamp (TIMESTAMP)
├── created_at (TIMESTAMP)
├── INDEX on device_id, timestamp DESC
├── INDEX on reading_id (UNIQUE)
└── Retención: 90 días por defecto

device_secrets (Cifrada)
├── id (UUID PRIMARY KEY)
├── device_id (UUID FOREIGN KEY)
├── secret_encrypted (BYTEA - AES-256)
├── created_at (TIMESTAMP)
└── rotation_at (TIMESTAMP)

audit_logs
├── id (UUID PRIMARY KEY)
├── user_id (UUID FOREIGN KEY)
├── device_id (UUID FOREIGN KEY)
├── action (VARCHAR: LOGIN, REGISTER, SYNC, READ)
├── ip_address (VARCHAR)
├── user_agent (VARCHAR)
├── timestamp (TIMESTAMP)
└── INDEX on user_id, timestamp DESC

MIGRACIONES:

V1__initial_schema.sql     ← Tablas básicas
V2__add_security.sql       ← Columnas de seguridad
V3__add_indexes.sql        ← Índices de performance
V4__add_audit.sql          ← Tabla audit_logs

GESTIÓN:

├── Hosted on Railway.app (Managed PostgreSQL)
├── Automatic backups cada 24h
├── Point-in-time recovery: 30 días
├── SSL connection required
├── Connection pooling: HikariCP (10 connections)
└── Replicación: Master-Slave (Alta disponibilidad)

═══════════════════════════════════════════════════════════════════════════════
🔟 DESPLIEGUE E INFRAESTRUCTURA
═══════════════════════════════════════════════════════════════════════════════

DESARROLLO LOCAL (docker-compose.yml)
──────────────────────────────────────

Services:
├── backend:
│   ├── Build: ./backend (Docker build)
│   ├── Port: 8080:8080
│   ├── Env: application-dev.yml
│   └── Depends: postgres

├── postgres:
│   ├── Image: postgres:16-alpine
│   ├── Port: 5432:5432
│   ├── Volume: ./data/postgres
│   └── Env: POSTGRES_PASSWORD=dev

├── pgadmin (opcional):
│   ├── Image: dpage/pgadmin4
│   ├── Port: 5050:80
│   └── Para visualizar BD

└── redis (opcional):
    ├── Image: redis:7-alpine
    ├── Port: 6379:6379
    └── Para caché/rate limiting

Levantar local:
docker-compose up -d


PRODUCCIÓN (Railway.app)
─────────────────────────

Arquitetura:
├── Backend container
│   ├── Spring Boot JAR
│   ├── JVM 17
│   ├── Memory: 512MB-2GB
│   ├── Auto-scaling: 1-3 instancias
│   ├── Health check: GET /actuator/health
│   └── Rolling deployments

├── PostgreSQL Database
│   ├── Managed instance
│   ├── Version: 16.x
│   ├── Backup automático
│   ├── SSL certificate
│   └── Failover automático

├── Frontend (Next.js)
│   ├── Vercel o AWS S3 + CloudFront
│   ├── Estático (HTML/CSS/JS)
│   ├── CDN global
│   └── Cache: 30 días

└── Environment Variables
    ├── DATABASE_URL (Railway)
    ├── JWT_SECRET (secreto)
    ├── JWT_EXPIRATION (3600s)
    ├── REFRESH_TOKEN_EXPIRATION (86400s)
    ├── RATE_LIMIT_REQUESTS (100)
    ├── RATE_LIMIT_WINDOW (60s)
    └── BACKEND_HOST (para ESP32)

Despliegue:
├── Git push → GitHub
├── GitHub Actions trigger
├── Build JAR: mvn clean package
├── Build imagen Docker
├── Push a Railway Registry
├── Railway redeploy automático
├── Health checks y rollback automático


MONITORING Y OBSERVABILIDAD
────────────────────────────

Logs:
├── Railway: Logs en tiempo real
├── Docker: Todas las imágenes loguean a stdout
├── Formato: JSON (máquina-readable)
└── Aggregation: Railway console

Métricas:
├── Spring Actuator: /actuator/metrics
├── Micrometer: Integración nativa
├── Prometheus: Scrape en /metrics
├── Grafana: Dashboard de métricas

Health Checks:
├── Backend: GET /actuator/health
├── DB: SELECT 1
├── Alert: Si falla, envía notificación

Trazas (Tracing):
├── Correlation ID en headers
├── Trace toda request de end-to-end
├── Logs: logger.info("action=X, correlationId=Y")

═══════════════════════════════════════════════════════════════════════════════
1️⃣1️⃣ SEGURIDAD
═══════════════════════════════════════════════════════════════════════════════

AUTENTICACIÓN

Usuario (OAuth 2.0 + JWT):
├── POST /api/v2/auth/login
│   ├── Recibe: email + password
│   ├── Valida: bcrypt password_hash
│   ├── Genera: JWT access token (1h) + refresh token (24h)
│   └── Response: { accessToken, refreshToken, email, fullName }
│
├── POST /api/v2/auth/refresh
│   ├── Recibe: refreshToken
│   ├── Valida: Firma + expiración
│   ├── Genera: Nuevo access token
│   └── Response: { accessToken }
│
└── JWT Claims:
    ├── sub: email (identificador único)
    ├── iat: timestamp emisión
    ├── exp: timestamp expiración
    ├── type: "user"
    ├── aud: "biosense-users"
    └── iss: "biosense-backend"

Dispositivo (Device JWT):
├── POST /devices/activate
│   ├── Recibe: deviceId + deviceSecret (por primera vez)
│   ├── Compara: Timing-safe comparison de deviceSecret
│   ├── Genera: Device JWT token (12h)
│   └── Response: { token }
│
├── POST /api/v2/sensors/reading
│   ├── Recibe: Authorization: Bearer deviceToken
│   ├── Valida: Firma + expiración
│   ├── Extrae: deviceId del token
│   └── Procesa: Lectura asociada a device
│
└── JWT Claims:
    ├── sub: deviceId
    ├── type: "device"
    ├── jti: UUID único (anti-replay)
    ├── aud: "biosense-devices"
    └── iss: "biosense-backend"


AUTORIZACIÓN

User-based:
├── @Secured("ROLE_USER"): Solo usuarios autenticados
├── @Secured("ROLE_ADMIN"): Solo administradores
└── Claims-based: Acceso solo a sus propios datos

Device-based:
├── Dispositivo solo ve sus propias lecturas
├── Device solo puede escribir sus propias readings
└── Verificar deviceId en token == deviceId en request

Resource-based:
├── GET /api/v2/sensors/readings/{deviceId}
│   ├─ Validar: El usuario es propietario de deviceId
│   └─ Retornar: Solo datos de ese dispositivo
└── 403 Forbidden si no es propietario


ENCRIPTACIÓN

En Tránsito:
├── HTTPS/TLS 1.2+: Todas las conexiones
├── Certificate pinning (ESP32): Validar cert del backend
├── BLE: AES-256-GCM para provisioning (futuro)
└── Secrets: Nunca en plaintext

En Reposo:
├── device_secret: bcrypt (no reversible)
├── JWT secrets: Almacenados en variables de entorno
├── NVS (ESP32): AES-256 (futuro)
├── Database: PostgreSQL ya tiene encriptación
└── Logs: No loguear tokens/secretos

Derivación de claves:
├── Passwords: bcrypt (12 rounds)
├── API Keys: Nunca usar, preferir JWT
├── Device secrets: Se rotan periódicamente
└── Session keys: Generadas aleatoriamente


PROTECCIÓN DE ATAQUE

Rate Limiting:
├── Por IP: 1000 requests/hora
├── Por usuario: 500 requests/hora
├── Por dispositivo: 100 readings/hora
├── Response: 429 Too Many Requests

CSRF:
├── POST/PUT/DELETE requieren CSRF token
├── SameSite=Strict en cookies
└── Validación en backend

SQL Injection:
├── Prepared statements: R2DBC (parameterized queries)
├── Validación de input: jakarta.validation
└── Escapar en cualquier SQL dinámico

XSS:
├── Frontend: DOMPurify para sanitizar HTML
├── Headers: Content-Security-Policy
├── Encoding: Todos los outputs escapados
└── TypeScript: Type-safe rendering

Timing Attacks:
├── Comparación de secretos: constantTimeEquals()
├── Comparación de tokens: timing-safe comparison
└── Hash: bcrypt (resistente a timing)

CORS:
├── Configured: Solo dominios permitidos
├── Métodos: GET, POST, PUT, DELETE
├── Headers: Authorization permitida
└── Credentials: true si es necesario

═══════════════════════════════════════════════════════════════════════════════
1️⃣2️⃣ DECISIONES ARQUITECTÓNICAS
═══════════════════════════════════════════════════════════════════════════════

DECISIÓN 1: Spring Boot WebFlux (vs Spring MVC)
────────────────────────────────────────────────

Razón:
✅ Reactive: Mejor uso de threads (event loop)
✅ Escalabilidad: Maneja más conexiones concurrentes
✅ Performance: Throughput superior
✅ Futuro: WebSocket, SSE built-in

Tradeoff:
❌ Más complejo: Curva de aprendizaje (Reactor)
❌ Debugging: Stack traces menos legibles
❌ Librerías: No todas soportan reactive

Alternativa considerada: Spring MVC
❌ Bloqueante: 1 thread por request
❌ Scaling: Necesita más servers
✅ Familiar: Más desarrolladores la conocen


DECISIÓN 2: PostgreSQL (vs MongoDB/DynamoDB)
──────────────────────────────────────────────

Razón:
✅ ACID: Garantías de consistencia (importante para datos)
✅ Relaciones: Integridad referencial entre tablas
✅ Queries: SQL poderosa para analytics
✅ Open Source: Sin vendor lock-in

Tradeoff:
❌ Escalabilidad horizontal: Más difícil que NoSQL
❌ Schema rígido: Cambios en schema requieren migración
✅ Máxima consistencia

Alternativa considerada: MongoDB
✅ Flexible schema: Fácil agregar campos
✅ Horizontal scaling: Sharding nativo
❌ Consistencia: eventual consistency (risky para datos críticos)
❌ No ACID: Transacciones limitadas


DECISIÓN 3: Hexagonal Architecture (vs MVC/3-Layer)
────────────────────────────────────────────────────

Razón:
✅ Testeable: Domain layer sin dependencies
✅ Flexible: Cambia BD sin cambiar lógica
✅ Escalable: Fácil agregar nuevas funcionalidades
✅ Mantenible: Separación clara de responsabilidades

Tradeoff:
❌ Overhead: Más clases, más interfaces
❌ Boilerplate: Adapters duplican code
❌ Curva aprendizaje: Difícil para juniors

Alternativa considerada: MVC Simple
❌ Controllers fat: Mezclan lógica y presentación
❌ Testeo difícil: Service depends on specific BD
✅ Rápido para prototipo


DECISIÓN 4: JWT para autenticación (vs Session-based)
───────────────────────────────────────────────────────

Razón:
✅ Stateless: Sin sesiones en servidor
✅ Escalable: Funciona en arquitectura distribuida
✅ Mobile-friendly: Tokens en headers
✅ Seguro: Firmados y expiración

Tradeoff:
❌ Revocación difícil: Token vive hasta expiración
❌ Token bloat: Puede crecer mucho
❌ Refresh token management: Más complejidad

Alternativa considerada: Session-based
❌ Statefull: Sesión en servidor
❌ Escalabilidad: Requiere session replication
✅ Revocación: Inmediata


DECISIÓN 5: Next.js para frontend (vs Vue/Angular)
────────────────────────────────────────────────────

Razón:
✅ Full-stack: Framework integrado
✅ SSR: Server-side rendering (SEO + performance)
✅ API Routes: Backend en mismo proyecto
✅ Comunidad: Masiva, muchos recursos

Tradeoff:
❌ Vendor lock-in: Vercel (aunque open source)
❌ Curva: SSR + hydration concepts complejos
❌ Node.js: Requiere Node.js en producción

Alternativa considerada: Vue
✅ Flexible: Framework sin opiniones
✅ Fácil: Menos magic que Next.js
❌ Menos integrado: Requiere Nuxt para SSR
❌ Comunidad: Más pequeña


DECISIÓN 6: Capacitor para mobile (vs React Native/Flutter)
──────────────────────────────────────────────────────────────

Razón:
✅ Code sharing: Mismo código Next.js en móvil
✅ Web-first: Usa tecnologías web (HTML/CSS/JS)
✅ Native access: Puente a APIs nativas (BLE, etc)
✅ Time-to-market: Rápido desarrollo

Tradeoff:
❌ Performance: No tan optimizado como nativo
❌ UX: Puede no sentirse 100% nativo
❌ App store: Requiere empaquetamiento

Alternativa considerada: React Native
✅ Performance: Más optimizado
❌ Código compartido: No es fácil con web
❌ Curva: Conceptos diferentes a web


DECISIÓN 7: BLE para provisioning (vs QR codes)
─────────────────────────────────────────────────

Razón:
✅ Seguro: Rango limitado (2-10 metros)
✅ Interactivo: Bidireccional (app ↔ device)
✅ User-friendly: Automático, sin escanear
✅ Escalable: Sin servidor intermediario

Tradeoff:
❌ Complexity: Implementación más difícil
❌ Battery: Consume energía (pero acceptable)
❌ Soporte: No todos los teléfonos antiguos

Alternativa considerada: QR codes
✅ Simple: Fácil implementación
✅ Offline: No requiere internet
❌ Menos seguro: QR visible públicamente
❌ Manual: Usuario debe escanear


DECISIÓN 8: HTTPS para ESP32 (vs HTTP)
──────────────────────────────────────

Razón:
✅ Seguridad: Datos encriptados en tránsito
✅ Autenticación: Verifica servidor (TLS handshake)
✅ Integridad: Detecta alteración de datos
✅ Production-ready: Estándar de la industria

Tradeoff:
❌ Overhead: Mayor consumo de CPU/batería
❌ Certificados: Requiere certificados válidos
❌ Complejidad: HTTPS implementation en embedded

Alternativa considerada: HTTP simple
❌ Inseguro: Datos en plaintext
❌ MITM: Vulnerable a man-in-the-middle
❌ No production-ready


DECISIÓN 9: Rate limiting por deviceId (vs IP)
─────────────────────────────────────────────────

Razón:
✅ Justo: Limita por dispositivo, no por red
✅ Fair: No afecta otros dispositivos en red
✅ Seguro: Previene abuso por deviceId
✅ Flexible: Diferentes límites por tipo

Tradeoff:
❌ Backend: Requiere tracking por deviceId
❌ Storage: Requiere cache (Redis)
❌ Bypass: Si alguien crea muchos deviceIds

Combinado:
├── Por IP: Limite general (1000/hora)
├── Por deviceId: Limite específico (100/hora)
└── Por usuario: Límite global (500/hora)


═══════════════════════════════════════════════════════════════════════════════
CONCLUSIÓN
═══════════════════════════════════════════════════════════════════════════════

BioSenseIoT es un sistema IoT moderno, escalable y seguro que integra:

✅ Hardware (ESP32): Sensores + comunicación segura
✅ Backend (Spring Boot WebFlux): Reactive, stateless, escalable
✅ Frontend (Next.js): SSR, TypeScript, moderna
✅ Mobile (Capacitor): Code sharing, nativo
✅ Database (PostgreSQL): ACID, confiable
✅ Deployment (Railway): Cloud-native, managed

Principios seguidos:
✅ SOLID: Clean, maintainable code
✅ Clean Architecture: Separación de concerns
✅ Security-first: Encriptación, autenticación, autorización
✅ DevOps: Containerization, CI/CD, monitoring
✅ Best practices: Error handling, logging, testing

Listo para producción con seguridad 65%+ y escalabilidad comprobada.

═══════════════════════════════════════════════════════════════════════════════

Documento: Arquitectura BioSenseIoT Completa
Versión: 2.1
Última actualización: 2024-04-20
Autor: IoT Architecture Team
