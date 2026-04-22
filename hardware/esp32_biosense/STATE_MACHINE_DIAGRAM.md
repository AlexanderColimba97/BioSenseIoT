# ESTADO MACHINE VISUAL DIAGRAM

## 🔄 State Transitions (Máquina de Estados)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BIOSENSE IoT v3 STATE MACHINE                   │
└─────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────┐
                          │      POWER ON       │
                          └──────────┬──────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌─────────────────────────┐      ┌──────────────────────┐
        │ api_secret in NVS?      │      │ api_secret in NVS?   │
        └────────┬────────────────┘      └──────────┬───────────┘
                 │                                   │
            ┌────┴─────┐                        ┌────┴─────┐
            │ NO        │ YES                   │ NO       │ YES
            ▼           ▼                       ▼          ▼
    ┌──────────────┐  [Continúa]    ┌─────────────┐  [Goto]
    │UNCONFIGURED  │               │  WARMUP     │
    └──────┬───────┘               └─────────────┘
           │
           │ Actions:
           │ - BLE Active
           │ - LED Orange (blink 500ms)
           │ - Read BLE Data
           │ - Monitor for credentials
           │
           │ Check every 5 sec: Are credentials here?
           │
           │ ┌─ New api_secret received via BLE
           │ │
           │ └──►  ┌──────────────────────┐
           │       │ Save to NVS          │
           │       │ BLEDevice::deinit()  │
           │       │ Call ESP.restart()   │
           │       └──────────┬───────────┘
           │                  │
           │                  └──► [WARMUP after reboot]
           │
           │
           └──────────────────────────────────────────┐
                                                      │
                                        ┌─────────────▼────────────┐
                                        │       WARMUP             │
                                        └────────┬────────────────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │  Actions:               │
                                    │  - WiFi.begin()         │
                                    │  - LED Green (pulse)    │
                                    │  - NTP Sync             │
                                    │  - Wait 30sec warmup    │
                                    └────────┬────────────────┘
                                             │
                            ┌────────────────┴────────────────┐
                            │                                 │
                    Timeout: 20sec              30sec passed
                    ▼                                 │
            ┌──────────────┐                        │
            │ ESP.restart()│                        │
            └──────────────┘                        │
                                                   ▼
                                        ┌──────────────────────┐
                                        │   OPERATIONAL        │
                                        └────────┬─────────────┘
                                                 │
                            ┌────────────────────┼────────────────┐
                            │                    │                 │
                            │     Conditions:    │                 │
                            │     - WiFi OK ✓    │                 │
                            │     - api_secret OK│                 │
                            │                    │                 │
                ┌───────────────┐               │      ┌─────────────────┐
                │ WiFi Lost?    │               │      │ Read Sensors    │
                └───────┬───────┘               │      │ Every 10 sec    │
                        │                       │      └────────┬────────┘
                    YES │                       │               │
                        │                       │      ┌────────▼────────┐
                        │                   Every 10   │ Send to Backend │
                        │                   seconds    │ with Bearer     │
                        │                       │      └─────────────────┘
                        │                       │
                        │         ┌─────────────┘
                        │         │
                        ▼         ▼
                  ┌─────────────────────┐
                  │ LED Risk Indicator  │
                  │ - Green (SAFE)      │
                  │ - Orange (WARNING)  │
                  │ - Red (DANGER)      │
                  └─────────────────────┘
                        │
                        │
                 ┌──────┴──────┐
                 │             │
                 │ WiFi Drops? │
                 │             │
                 │ YES  │  NO  │
                 ▼      │      ▼
          ┌──────────┐  │  [Stay in OPERATIONAL]
          │ WiFi Lost│  │
          │ Return to│  │
          │ WARMUP   │  │
          └──────────┘  │
                        │
                        └─► [Loop continuously]
```

---

## 📊 STATE DETAILS

### 1️⃣ STATUS_UNCONFIGURED
```
┌─────────────────────────────────────────────┐
│          STATUS_UNCONFIGURED                │
│    (No API Secret in NVS / No Device Owner) │
├─────────────────────────────────────────────┤
│                                             │
│  Setup:                                     │
│  ├─ BLEDevice::init() ACTIVE               │
│  ├─ BLE Advertising:  "BioSense-CCDD"     │
│  └─ LED Orange: BLINKING (500ms on/off)    │
│                                             │
│  Sensors:                                   │
│  ├─ ADC: NOT READ                           │
│  └─ Backend: NO SENDS                       │
│                                             │
│  Loop Actions:                              │
│  ├─ Every 500ms: Blink orange LED          │
│  ├─ Every 5sec: Check BLE for credentials   │
│  └─ Listen for BLE writes                   │
│                                             │
│  Transition to WARMUP when:                 │
│  ├─ api_secret received via BLE            │
│  ├─ Saved to NVS                           │
│  ├─ BLEDevice::deinit() called             │
│  └─ ESP.restart()                           │
│                                             │
│  User Action:                               │
│  1. Opens app → "MI PERFIL"                │
│  2. Taps "SINCRONIZAR"                     │
│  3. Scans Bluetooth → Finds "BioSense-XX" │
│  4. Sends SSID,PASSWORD,API_SECRET         │
│  5. App says "Vinculado ✓"                 │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 2️⃣ STATUS_WARMUP
```
┌─────────────────────────────────────────────┐
│          STATUS_WARMUP                      │
│  (WiFi Connecting + Sensor Calibration)    │
├─────────────────────────────────────────────┤
│                                             │
│  Setup:                                     │
│  ├─ WiFi.begin(ssid, password)             │
│  ├─ BLE: Already deinitialized             │
│  └─ LED Green: PULSING (0.2s on/off)      │
│                                             │
│  Sensors:                                   │
│  ├─ ADC: Reading & averaging                │
│  ├─ Warmup time: 30 seconds                 │
│  └─ Backend: NO SENDS (warming up)          │
│                                             │
│  Clock Sync:                                │
│  ├─ configTime() with NTP                   │
│  └─ Wait for epoch > 1700000000             │
│                                             │
│  Loop Actions:                              │
│  ├─ Attempt WiFi connection                 │
│  ├─ Every 1sec: Show remaining warmup time  │
│  ├─ Pulse green LED                         │
│  └─ Read sensors (optional, for display)    │
│                                             │
│  WiFi Timeout:                              │
│  ├─ If > 20 seconds: ESP.restart()         │
│  └─ (Usually connects in 5-10 seconds)     │
│                                             │
│  Transition to OPERATIONAL when:            │
│  ├─ WiFi connected OK                       │
│  ├─ 30 seconds elapsed                      │
│  └─ Clock synced with NTP                   │
│                                             │
│  Timeout behavior:                          │
│  ├─ WiFi timeout → restart                  │
│  ├─ NTP timeout → continue anyway           │
│  │  (will use fallback timestamp)           │
│  └─ Duration: ~30-35 seconds total          │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3️⃣ STATUS_OPERATIONAL
```
┌─────────────────────────────────────────────┐
│          STATUS_OPERATIONAL                 │
│       (Ready for Production - Live Mode)    │
├─────────────────────────────────────────────┤
│                                             │
│  Setup:                                     │
│  ├─ WiFi: Connected OK                      │
│  ├─ BLE: Deinitialized (radio free)        │
│  ├─ LED: Dynamic risk indicator             │
│  │  ├─ Green (SAFE): CO<9, CH4<500, CO2<1000
│  │  ├─ Orange (WARN): Elevated values       │
│  │  └─ Red (DANGER): CO>30, CH4>1000, ...  │
│  └─ Sensors: Active & calibrated            │
│                                             │
│  Main Loop:                                 │
│  ├─ Every iteration: Check WiFi.status()   │
│  ├─ Every 10 seconds:                       │
│  │  ├─ Read ADC × 3 sensors                 │
│  │  ├─ Convert ADC → PPM                    │
│  │  ├─ Evaluate risk level                  │
│  │  ├─ Update LED indicator                 │
│  │  └─ Send to backend:                     │
│  │      ├─ Authorization: Bearer [secret]   │
│  │      ├─ JSON: macAddress + readingId     │
│  │      └─ HTTP 201 → success ✓             │
│  └─ delay(50ms) → WDT safe                  │
│                                             │
│  Strict Checks:                             │
│  ├─ if (WiFi.status() != CONNECTED)        │
│  │  └─ return WARMUP immediately            │
│  ├─ if (apiSecret.length() == 0)           │
│  │  └─ return false (don't send)            │
│  ├─ if (readingId is duplicate)            │
│  │  └─ skip send (avoid duplication)        │
│  └─ if (HTTP 401/403)                       │
│     └─ invalid credentials                  │
│                                             │
│  Backend Response Codes:                    │
│  ├─ 200/201: Success ✓                      │
│  ├─ 409: Duplicate (already stored) ✓      │
│  ├─ 401/403: Auth failed ✗                  │
│  └─ 5xx: Server error (retry later)         │
│                                             │
│  WiFi Loss Detection:                       │
│  ├─ Strict check: if (WiFi != CONNECTED)   │
│  ├─ Action: Return to WARMUP                │
│  ├─ LED: Turn off RED (safety)              │
│  └─ Auto-reconnect logic in WARMUP          │
│                                             │
│  Sensor Data Per Reading:                   │
│  ├─ macAddress: FF:AA:BB:CC:DD:EE          │
│  ├─ readingId: MAC-epoch-nonce             │
│  ├─ mq4: 0-10000 ppm (CH4)                  │
│  ├─ mq7: 0-1000 ppm (CO)                    │
│  ├─ mq135: 0-10000 ppm (Air Quality)        │
│  └─ timestamp: Unix epoch (seconds)         │
│                                             │
│  Deduplication:                             │
│  ├─ Each reading gets unique readingId      │
│  ├─ Stored in buffer (100 entries max)      │
│  ├─ Prevents duplicate sends if retry       │
│  └─ HTTP 409 = already received by backend  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔁 TRANSITION MATRIX

```
Current State  │  Condition             │  Next State
───────────────┼────────────────────────┼──────────────────
UNCONFIGURED   │  Credentials via BLE   │  → WARMUP
               │                        │
WARMUP         │  WiFi timeout (20s)    │  → UNCONFIGURED
               │  (restart entire)      │
               │                        │
WARMUP         │  WiFi OK + 30sec       │  → OPERATIONAL
               │                        │
OPERATIONAL    │  WiFi lost             │  → WARMUP
               │  (WiFi.status() fail)  │
               │                        │
OPERATIONAL    │  Every 10s             │  [Stay]
               │  + Send data           │
               │                        │
OPERATIONAL    │  Sensor error          │  [Log & Skip]
               │  (no state change)     │
```

---

## ⏱️ TIMING BREAKDOWN

```
Event                      Duration    Blocking?  Notes
────────────────────────────────────────────────────────────
BLE Initialization         < 1 sec     No         In UNCONFIGURED
BLE Waiting Period         Infinite    No         Until credentials arrive
BLE Data Reception         < 100ms     No         Callback only
ESP Restart After BLE      2 sec       Yes        (Only happens once)
WiFi Connection Attempt    10-15 sec   No         (Non-blocking)
Sensor Warmup              30 sec      No         Parallel warmup
NTP Sync (if needed)       5-8 sec     No         Parallel with WiFi
Sensor Read                ~100ms      Blocking   (ADC averaging)
PPM Calculation            < 1ms       No         (Math only)
HTTP POST                  2-5 sec     No         (With timeout)
Total Boot→Operational     ~40-50 sec  Incremental
```

---

## 🎯 KEY DECISION POINTS

```
┌─ PowerOn
│
├─► Q1: api_secret in NVS?
│   ├─ NO  → UNCONFIGURED
│   └─ YES → WARMUP
│
├─ (If UNCONFIGURED)
│
├─► Q2: BLE data received?
│   ├─ NO  → Stay UNCONFIGURED (repeat)
│   └─ YES → Save NVS + ESP.restart() → WARMUP
│
├─ (If WARMUP)
│
├─► Q3: WiFi connected?
│   ├─ NO  → Stay WARMUP (retry)
│   └─ YES → Q4
│
├─► Q4: Warmup 30sec elapsed?
│   ├─ NO  → Stay WARMUP
│   └─ YES → OPERATIONAL
│
├─ (If OPERATIONAL, every iteration)
│
├─► Q5: WiFi.status() == CONNECTED?
│   ├─ NO  → Back to WARMUP
│   └─ YES → Q6
│
├─► Q6: Time for sensor read (10s)?
│   ├─ NO  → Sleep 50ms, repeat
│   └─ YES → Read sensors + Send
│
└─ (Loop)
```

---

## 🔐 SECURITY FLOW

```
UNCONFIGURED                    WARMUP                  OPERATIONAL
     │                            │                          │
     ├─ BLE Listening            │                          │
     │  User sends:               │                          │
     │  "SSID,PASS,SECRET"        │                          │
     │                            │                          │
     │  ✓ Parse & validate        │                          │
     │  ✓ Save to NVS             │                          │
     │  ✓ Encrypt? (NVS does)     │                          │
     │  ✓ Restart                 │                          │
     │                            │                          │
     └─────────────────────────►  │                          │
                                  │                          │
                                  ├─ Load from NVS           │
                                  │ ✓ Secure storage        │
                                  │                          │
                                  ├─ WiFi.begin(SSID, PASS) │
                                  │ ✓ Uses WPA2/WPA3        │
                                  │                          │
                                  ├─ NTP Sync for timestamp  │
                                  │ ✓ Prevent timestamp      │
                                  │   replay attacks        │
                                  │                          │
                                  └─────────────────────►   │
                                                            │
                                                            ├─ Auth:
                                                            │ Bearer [API_SECRET]
                                                            │ ✓ HTTPS only
                                                            │ ✓ No HTTP fallback
                                                            │
                                                            ├─ Payload:
                                                            │ readingId unique
                                                            │ ✓ Deduplication
                                                            │ ✓ Timestamps
                                                            │
                                                            ├─ Backend Checks:
                                                            │ ✓ Verify Bearer
                                                            │ ✓ Verify macAddress
                                                            │ ✓ Check readingId
                                                            │ ✓ Return 409 if dup
                                                            │
                                                            └─ Response:
                                                              201 = Stored
                                                              409 = Duplicate
                                                              401 = Bad auth
```

---

## 📈 STATE DIAGRAM (Graphviz notation)

```
digraph state_machine {
    rankdir=LR;
    
    UNCONFIGURED [shape=box, style=filled, fillcolor=orange];
    WARMUP [shape=box, style=filled, fillcolor=yellow];
    OPERATIONAL [shape=box, style=filled, fillcolor=green];
    
    UNCONFIGURED -> WARMUP [label="Credentials via BLE"];
    WARMUP -> WARMUP [label="WiFi attempting"];
    WARMUP -> OPERATIONAL [label="WiFi OK + 30sec"];
    WARMUP -> UNCONFIGURED [label="WiFi timeout"];
    OPERATIONAL -> WARMUP [label="WiFi lost"];
    OPERATIONAL -> OPERATIONAL [label="Send data / 10s"];
}
```

---

## ✅ VERIFICATION CHECKLIST PER STATE

### UNCONFIGURED
- [ ] BLE advertising "BioSense-XXXX"
- [ ] LED Orange blinking 500ms
- [ ] Serial: "BLE READY"
- [ ] No WiFi connection attempt
- [ ] No sensor reading

### WARMUP
- [ ] WiFi.begin() called
- [ ] LED Green pulsing
- [ ] Serial: "Connecting to WiFi"
- [ ] After connection: "WiFi connected"
- [ ] Sensors reading (for display)
- [ ] 30-second countdown visible

### OPERATIONAL
- [ ] LED dynamic (Green/Orange/Red)
- [ ] Every 10s: "SENSOR DATA: ..."
- [ ] Every 10s: "Reading sent successfully" (or retry)
- [ ] HTTP 201 responses in logs
- [ ] Continuous WiFi.status() checks
- [ ] No BLE transmissions

---

## 🎓 LEARNING RESOURCES

To understand this state machine better:

1. **State Machine Basics:**
   - Each state is mutually exclusive
   - Transitions are deterministic
   - Current state determines next action

2. **Non-Blocking Architecture:**
   - Use `millis()` instead of `delay()`
   - Each loop() iteration checks timers
   - Enables multiple simultaneous tasks

3. **WiFi Verification:**
   - Check `WiFi.status() == WL_CONNECTED`
   - Never assume WiFi is up
   - Always verify before network I/O

4. **Radio Coexistence:**
   - WiFi & BLE share antenna
   - Conflict if both transmit together
   - Solution: Disable BLE after binding

---

**This diagram is the core of v3 architecture.**
Use it to understand transitions, debug issues, or modify behavior.
