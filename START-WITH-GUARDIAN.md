# 🏗️ System Architecture Guardian - START HERE

> **Everything you need to keep BioSenseIoT consistent, secure, and maintainable**

---

## 📋 What You've Been Given

A complete **architecture enforcement system** with 5 interconnected files:

| File | Purpose | Read When |
|------|---------|-----------|
| **GUARDIAN-README.txt** | Quick orientation | First (5 min) |
| **.instructions.md** | Core rules | Second (15 min) |
| **ARCHITECTURE-GUARDIAN-GUIDE.md** | Practical workflow | Third (45 min) |
| **validate-architecture.sh** | Automated checks | Before commits |
| **ARCHITECTURE-GUARDIAN-INDEX.md** | Complete reference | When you need answers |

---

## ⚡ Start Now (5 Minutes)

```bash
# 1. Read the quick start
cat GUARDIAN-README.txt

# 2. Understand the core rules
cat .instructions.md

# 3. Validate your current code
bash validate-architecture.sh
```

---

## 🎯 The Three Sacred Rules (Memorize These)

### Rule 1: Authenticate Correctly
- User JWT ≠ Device JWT
- NEVER use API keys
- Always use Bearer token

### Rule 2: Trust Only the Server
- `deviceId` comes from JWT (server truth)
- `deviceId` NEVER from request body
- Extract on server, validate always

### Rule 3: Keep Layers Clean
- **Controllers**: Route requests
- **Services**: Business logic
- **Repositories**: Database access
- No mixing!

---

## ✅ What's Correct?

```java
// ✅ CORRECT: Device endpoint with Bearer token
@PostMapping("/api/v2/sensors/reading")
@Secured("ROLE_DEVICE")
public Mono<Response> saveReading(
    @RequestHeader("Authorization") String token,
    @RequestBody SensorDTO dto
) {
    String deviceId = jwtService.extractDeviceId(token);
    return sensorService.process(deviceId, dto);
}
```

```cpp
// ✅ CORRECT: ESP32 sending with Bearer token
void sendData() {
    String token = preferences.getString("device_token");
    http.addHeader("Authorization", "Bearer " + token);
    int response = http.POST(jsonPayload);
}
```

---

## 🚨 What to Reject

```java
// ❌ WRONG: API key
http.addHeader("X-BioSense-Key", secret);

// ❌ WRONG: deviceId from request
String deviceId = request.getParameter("deviceId");

// ❌ WRONG: HTTP
"http://backend.com/api/..."

// ❌ WRONG: Business logic in controller
@PostMapping("/data")
public void save() {
    // DO CALCULATIONS HERE ← WRONG!
}

// ❌ WRONG: Hardcoded secrets
private static final String SECRET = "super-secret";
```

---

## 🔍 Validate Your Code

```bash
bash validate-architecture.sh
```

**Output**: 15 automated checks

```
✅ APPROVED:  12 checks
⚠️  WARNINGS:  1 check
❌ VIOLATIONS: 2 checks

🚨 CRITICAL: 2 violations found - DEPLOYMENT BLOCKED
```

---

## 📖 How to Use These Files

### For Backend Developers
1. Read `.instructions.md` (Backend section)
2. Check `ARCHITECTURE-GUARDIAN-GUIDE.md` (PATTERN 1 & 2)
3. Before commit: `bash validate-architecture.sh`

### For Frontend Developers
1. Read `.instructions.md` (Frontend section)
2. Check `ARCHITECTURE-GUARDIAN-GUIDE.md` (Bearer Token section)
3. Before PR: `bash validate-architecture.sh`

### For Firmware Engineers (ESP32)
1. Read `.instructions.md` (Hardware section)
2. Check `ARCHITECTURE-GUARDIAN-GUIDE.md` (PATTERN 3)
3. Before release: `bash validate-architecture.sh`

### For Architects / Team Leads
1. Read `.instructions.md` (entire)
2. Study `ARQUITECTURA-COMPLETA.md`
3. Enforce: Run validation on every PR
4. Update: When architecture changes

---

## 🚀 Code Review Process (6 Steps)

Using `ARCHITECTURE-GUARDIAN-GUIDE.md`:

1. **Identify Component** - What is this (controller/service/firmware)?
2. **Trace Authentication** - Who authenticates (user/device)?
3. **Verify Data Source** - Where does deviceId come from (JWT/request)?
4. **Check Business Logic** - Is it in the right layer?
5. **Assess Security** - Is validation present, secrets safe?
6. **Decision** - Approve / Refactor / Reject?

---

## 🎓 Learning Path (4 Days)

**Day 1**: Learn the rules
- Read `.instructions.md` (30 min)
- Read `ARCHITECTURE-GUARDIAN-GUIDE.md` (45 min)
- Read `ARQUITECTURA-COMPLETA.md` sections 1-4 (30 min)

**Day 2**: Understand your codebase
- Run `validate-architecture.sh` (5 min)
- Review violations (30 min)
- Study one example pattern (20 min)

**Day 3**: Apply to your code
- Write code following patterns (varies)
- Self-review against checklist (15 min)
- Run validation (2 min)

**Day 4**: Help your team
- Review code using framework
- Share patterns from guide
- Enforce validation on PRs

---

## 📚 File Quick Reference

**Need to...** | **Read...**
---|---
Learn the rules | `.instructions.md`
Review code | `ARCHITECTURE-GUARDIAN-GUIDE.md`
Run tests | `bash validate-architecture.sh`
Find something | `ARCHITECTURE-GUARDIAN-INDEX.md`
Understand architecture | `ARQUITECTURA-COMPLETA.md`
Get visual overview | `RESUMEN-ARQUITECTURA.md`
Quick start | This file

---

## ✨ Why This Matters

- **Consistent**: All code follows same patterns
- **Secure**: No API keys, no hardcoded secrets
- **Maintainable**: Clean architecture, easy to extend
- **Scalable**: System grows without degrading
- **Fast**: New developers onboard quicker
- **Automated**: Violations caught before code review

---

## 🎯 Your Next Move

1. **Right now**: Read `.instructions.md` (10 min)
2. **Then**: Read `ARCHITECTURE-GUARDIAN-GUIDE.md` (30 min)
3. **Then**: Run `bash validate-architecture.sh`
4. **Then**: Review existing code using the guide
5. **Always**: Reference when coding or reviewing

---

## ❓ Questions?

| Question | Find in |
|----------|---------|
| What's a red flag? | `ARCHITECTURE-GUARDIAN-GUIDE.md` → RED FLAGS section |
| How do I implement this? | `ARCHITECTURE-GUARDIAN-GUIDE.md` → PATTERNS section |
| What rules apply to me? | `ARCHITECTURE-GUARDIAN-INDEX.md` → YOUR ROLE section |
| Where's the checklist? | `ARCHITECTURE-GUARDIAN-GUIDE.md` → WORKFLOW section |
| I need a quick answer | `ARCHITECTURE-GUARDIAN-INDEX.md` → QUICK ANSWERS |

---

## 🏆 Success Criteria

You're using Guardian successfully when:

- ✅ New code follows rules automatically
- ✅ Code reviews reference the docs
- ✅ `validate-architecture.sh` passes
- ✅ Zero API key violations
- ✅ JWT used consistently
- ✅ All endpoints protected
- ✅ Clean architecture maintained
- ✅ New violations caught quickly

---

## 📌 Remember

This system exists to:
- **Save time** (automate checks)
- **Prevent bugs** (consistent patterns)
- **Maintain quality** (all code follows rules)
- **Enable scaling** (grow without breaking)
- **Document decisions** (why was this designed this way?)

**It's not bureaucracy. It's LIBERATION.**

Clear rules → Faster development
Consistent patterns → Fewer bugs
Automation → More time for real work
Good architecture → Long-term sustainability

---

## 🚀 Ready?

**Next file to read: `.instructions.md`** (required, 15 minutes)

This will teach you the core rules that everything else is built on.

---

**Created**: 2024-04-20  
**Status**: ✅ Active and ready to use  
**Version**: 1.0  
**Maintained by**: System Architecture Team
