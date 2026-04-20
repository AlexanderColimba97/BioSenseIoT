╔═══════════════════════════════════════════════════════════════════════════════╗
║                   🏗️ SYSTEM ARCHITECTURE GUARDIAN - README                  ║
║                                                                               ║
║  Your automated architecture enforcer for consistent, secure BioSenseIoT    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 WHAT IS THIS?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The System Architecture Guardian is your enforcement framework for BioSenseIoT.

It ensures:
  ✅ Consistent authentication (JWT correctly)
  ✅ Secure communication (no API keys)
  ✅ Clean architecture (layers properly separated)
  ✅ Data integrity (no duplicates, proper keys)
  ✅ Long-term maintainability (future-proof)

Think of it as having a senior architect on every code review.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 GET STARTED IN 5 MINUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Read this file (2 min) ← YOU ARE HERE
2. Read .instructions.md (10 min)
3. Run: bash validate-architecture.sh (1 min)
4. Read ARCHITECTURE-GUARDIAN-GUIDE.md (30 min)

Total: ~45 minutes to understand everything

THEN: Use ARCHITECTURE-GUARDIAN-GUIDE.md for code reviews and development


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 FILES IN THIS SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIS FILE:
  📄 GUARDIAN-README.txt
     ↓ You are reading this now
     ↓ Quick orientation to the system
     ↓ Start here

CORE RULES:
  📋 .instructions.md
     ↓ Non-negotiable architecture rules
     ↓ Define what's correct and wrong
     ↓ Three Sacred Rules at the end
     ↓ READ THIS SECOND

PRACTICAL GUIDE:
  📘 ARCHITECTURE-GUARDIAN-GUIDE.md
     ↓ How to actually use the rules
     ↓ Step-by-step code review workflow
     ↓ Red flags to watch for
     ↓ Example patterns to copy
     ↓ READ THIS THIRD

AUTOMATED VALIDATION:
  🔧 validate-architecture.sh
     ↓ Bash script that checks 15 rules
     ↓ Gives pass/fail summary
     ↓ Works in CI/CD pipelines
     ↓ RUN THIS BEFORE EVERY COMMIT

NAVIGATION:
  📚 ARCHITECTURE-GUARDIAN-INDEX.md
     ↓ Complete index and reference
     ↓ How to find answers fast
     ↓ Learning paths for each role
     ↓ READ WHEN YOU NEED TO FIND SOMETHING

DEEP REFERENCE:
  📐 ARQUITECTURA-COMPLETA.md
     ↓ Detailed architecture documentation
     ↓ All components, layers, patterns
     ↓ REFERENCE when you need deep understanding

QUICK OVERVIEW:
  📊 RESUMEN-ARQUITECTURA.md
     ↓ Visual ASCII diagrams
     ↓ Quick summary of architecture
     ↓ REFERENCE for onboarding


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ QUICK REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I NEED TO...                           I SHOULD READ...

Learn the rules                    →   .instructions.md
Review code                        →   ARCHITECTURE-GUARDIAN-GUIDE.md
Run automated tests                →   bash validate-architecture.sh
Understand architecture            →   ARQUITECTURA-COMPLETA.md
Get a visual overview              →   RESUMEN-ARQUITECTURA.md
Find something specific            →   ARCHITECTURE-GUARDIAN-INDEX.md
Implement a pattern                →   ARCHITECTURE-GUARDIAN-GUIDE.md (Patterns section)
Check if code is wrong             →   ARCHITECTURE-GUARDIAN-GUIDE.md (Red Flags section)
Know what's correct                →   ARCHITECTURE-GUARDIAN-GUIDE.md (What's Correct section)
Teach this to my team              →   ARCHITECTURE-GUARDIAN-GUIDE.md (Learning Path)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 THREE SACRED RULES (MEMORIZE THESE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rule 1: AUTHENTICATE CORRECTLY
────────────────────────────────
• User authentication: JWT from email+password
• Device authentication: JWT from deviceId+deviceSecret
• NEVER mix them
• NEVER use API keys (X-BioSense-Key is WRONG)

Rule 2: TRUST ONLY THE SERVER
───────────────────────────────
• deviceId ALWAYS comes from JWT (server knows what device this is)
• deviceId NEVER comes from request body (attacker could forge it)
• If you see deviceId in request body, REJECT IT

Rule 3: KEEP LAYERS CLEAN
──────────────────────────
• Controller: Route HTTP requests → call service
• Service: Business logic → call repository
• Repository: Access database → return data
• NEVER mix these (don't put DB logic in controller!)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ WHAT'S CORRECT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Headers:
  ✅ Authorization: Bearer <jwt-token>
  ❌ X-BioSense-Key: <secret>

Authentication:
  ✅ User JWT: {sub: email, type: "user"}
  ✅ Device JWT: {sub: deviceId, type: "device"}
  ❌ API Key
  ❌ Mixed authentication

Communication:
  ✅ HTTPS (encrypted)
  ✅ Bearer tokens
  ✅ JSON payloads
  ❌ HTTP (unencrypted)
  ❌ Hardcoded secrets

Code Organization:
  ✅ @Controller (routing only)
  ✅ @Service (business logic)
  ✅ @Repository (database)
  ❌ Business logic in @Controller
  ❌ Database queries in @Service

Data:
  ✅ readingId = unique per reading
  ✅ deviceId = from JWT
  ✅ Validation = on all inputs
  ❌ No readingId (duplicates allowed)
  ❌ deviceId from request
  ❌ Unvalidated input


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 RED FLAGS (ALWAYS REJECT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you see these, BLOCK the code:

❌ X-BioSense-Key header
   → API keys are insecure
   → Must use JWT Bearer token

❌ deviceId from request body
   → User can forge device ownership
   → Must extract from JWT

❌ HTTP (not HTTPS)
   → Data exposed in transit
   → Must use HTTPS always

❌ Hardcoded secrets
   → Secrets exposed on GitHub
   → Must use environment variables

❌ Business logic in @Controller
   → Not reusable, hard to test
   → Must move to @Service

❌ No authorization checks
   → Anyone can access any data
   → Must add @Secured + ownership checks

❌ Mixed authentication types
   → User JWT used for devices
   → Must keep separate


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 RUN AUTOMATED VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEFORE EVERY COMMIT:

    bash validate-architecture.sh

OUTPUT:
    ✅ Check passes
    ⚠️  Warning found
    ❌ Violation found

CHECKS (15 total):

Backend (Java):
  ✅ No X-BioSense-Key
  ✅ Bearer tokens used
  ✅ No hardcoded secrets
  ✅ DI pattern
  ✅ Service layer exists

Firmware (ESP32):
  ✅ No X-BioSense-Key
  ✅ Bearer tokens used
  ✅ HTTPS enabled
  ✅ readingId deduplication

Database:
  ✅ reading_id UNIQUE
  ✅ device_id FK
  ✅ Indexes present

Frontend:
  ✅ TypeScript configured
  ✅ No hardcoded endpoints


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 LEARNING PATH (4 DAYS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAY 1: READ EVERYTHING
────────────────────────
  Morning:  .instructions.md (30 min)
  Midday:   ARCHITECTURE-GUARDIAN-GUIDE.md (45 min)
  Evening:  ARQUITECTURA-COMPLETA.md sections 1-4 (30 min)
  
  Result: You understand the rules

DAY 2: UNDERSTAND YOUR CODEBASE
─────────────────────────────────
  Morning:  Run validate-architecture.sh (5 min)
  Midday:   Review violations (30 min)
  Evening:  Study one example pattern (20 min)
  
  Result: You know what needs fixing

DAY 3: APPLY TO YOUR CODE
──────────────────────────
  Morning:  Write new code (varies)
  Midday:   Self-review against checklist (15 min)
  Evening:  Run validate-architecture.sh (2 min)
  
  Result: Your code follows all rules

DAY 4: HELP YOUR TEAM
────────────────────
  All day:  Review team code using framework
  Share:    ARCHITECTURE-GUARDIAN-GUIDE.md patterns
  Enforce:  Run validation on all PRs
  
  Result: Entire team follows rules


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 COMMON QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: Which file do I read first?
A: This file (GUARDIAN-README.txt) → then .instructions.md

Q: Where's the code review checklist?
A: ARCHITECTURE-GUARDIAN-GUIDE.md (section: WORKFLOW)

Q: Where are example patterns?
A: ARCHITECTURE-GUARDIAN-GUIDE.md (section: DOING IT RIGHT)

Q: What are the red flags?
A: ARCHITECTURE-GUARDIAN-GUIDE.md (section: RED FLAGS)

Q: How do I validate my code?
A: Run: bash validate-architecture.sh

Q: I need a quick reference
A: ARCHITECTURE-GUARDIAN-GUIDE.md (section: QUICK REFERENCE)

Q: Where's the detailed architecture?
A: ARQUITECTURA-COMPLETA.md (read all 12 sections)

Q: I need visual overview
A: RESUMEN-ARQUITECTURA.md (ASCII diagrams)

Q: I need to find something specific
A: ARCHITECTURE-GUARDIAN-INDEX.md (complete index)

Q: How do I teach this to my team?
A: Share ARCHITECTURE-GUARDIAN-GUIDE.md (Learning Path section)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ YOUR NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RIGHT NOW:

  1. Read .instructions.md (10 minutes)
  2. Run: bash validate-architecture.sh (check status)
  3. Read ARCHITECTURE-GUARDIAN-GUIDE.md (30 minutes)
  4. Bookmark ARCHITECTURE-GUARDIAN-INDEX.md (quick reference)

THEN:

  1. Review existing code using the guide
  2. Fix any violations found
  3. Use patterns from "DOING IT RIGHT" section
  4. Run validation before every commit

FINALLY:

  1. Review team code using same framework
  2. Reference the rules in discussions
  3. Help new developers onboard
  4. Keep architecture consistent


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 SUCCESS LOOKS LIKE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In 1 week:
  ✅ New code follows rules automatically
  ✅ Code reviews reference architecture docs
  ✅ validate-architecture.sh passes

In 1 month:
  ✅ Zero API key violations
  ✅ JWT used consistently everywhere
  ✅ All endpoints protected
  ✅ Clean architecture maintained
  ✅ New violations caught quickly

In 3 months:
  ✅ System is more maintainable
  ✅ Fewer bugs in production
  ✅ New developers onboard faster
  ✅ Team understands "why" for each decision
  ✅ Long-term sustainability achieved


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to start? Read .instructions.md next!

It takes 10 minutes and will save you HOURS of debugging.

═══════════════════════════════════════════════════════════════════════════════

Document: System Architecture Guardian - Quick Start Guide
Version: 1.0
Status: ✅ READY TO USE
Created: 2024-04-20

Next file: .instructions.md (required reading)
