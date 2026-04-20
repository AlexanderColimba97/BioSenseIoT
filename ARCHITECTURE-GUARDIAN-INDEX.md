╔═══════════════════════════════════════════════════════════════════════════════╗
║           🏗️ SYSTEM ARCHITECTURE GUARDIAN - COMPLETE INDEX                  ║
║                    Enforcement System for BioSenseIoT                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📚 GUARDIAN FILES (READ IN THIS ORDER)
═══════════════════════════════════════════════════════════════════════════════

1. 📖 THIS FILE (START HERE)
   └─ Overview of entire guardian system
   └─ File navigation
   └─ How to use effectively

2. 📋 .instructions.md (CORE RULES)
   ├─ System Definition
   ├─ Core Rules (NON-NEGOTIABLE)
   ├─ Device Flow (5-step mandatory process)
   ├─ Enforcement Behavior
   ├─ Output Requirements
   └─ Three Sacred Rules (final section)
   
   🎯 USE FOR: Understanding architecture rules

3. 📘 ARCHITECTURE-GUARDIAN-GUIDE.md (PRACTICAL WORKFLOW)
   ├─ What is the Guardian?
   ├─ How to Use (4-step process)
   ├─ Quick Reference (What's Correct?)
   ├─ Code Review Workflow (6 steps)
   ├─ Common Scenarios (3 real examples)
   ├─ Red Flags (always reject these)
   ├─ Doing It Right (copy these patterns)
   ├─ Support (Q&A)
   ├─ Learning Path (4-day course)
   └─ Final Checklist
   
   🎯 USE FOR: Actual code review and development

4. 🔧 validate-architecture.sh (AUTOMATED VALIDATION)
   ├─ Bash script (cross-platform)
   ├─ 15 automated checks
   ├─ Identifies violations automatically
   ├─ Provides pass/fail summary
   └─ Exit codes for CI/CD integration
   
   🎯 USE FOR: Automated testing before deployment

5. 📐 ARQUITECTURA-COMPLETA.md (REFERENCE)
   ├─ Executive Summary
   ├─ Complete Project Structure
   ├─ Architecture Layers (Backend, Frontend, Hardware, Database)
   ├─ Component Details (5 major components)
   ├─ Programming Paradigms (OOP, Reactive, Functional, DI)
   ├─ SOLID Principles (S, O, L, I, D - applied)
   ├─ Design Patterns (used throughout system)
   ├─ Data Flow (complete diagrams)
   ├─ Database Schema (detailed)
   ├─ Deployment & Infrastructure
   ├─ Security (comprehensive)
   └─ Architectural Decisions (with rationale)
   
   🎯 USE FOR: Deep understanding and reference

6. 📊 RESUMEN-ARQUITECTURA.md (QUICK OVERVIEW)
   ├─ Visual ASCII diagrams
   ├─ High-level component overview
   ├─ Quick architecture summary
   └─ Useful for onboarding
   
   🎯 USE FOR: Quick reference and presentations


═══════════════════════════════════════════════════════════════════════════════
🎯 QUICK START: HOW TO USE GUARDIAN
═══════════════════════════════════════════════════════════════════════════════

DAY 1: LEARN THE RULES
──────────────────────
1. Read .instructions.md (30 min)
2. Memorize THREE SACRED RULES (10 min)
3. Read ARCHITECTURE-GUARDIAN-GUIDE.md (45 min)
4. Review ARQUITECTURA-COMPLETA.md sections 1-4 (30 min)

Result: You understand what's correct


DAY 2: UNDERSTAND YOUR CODEBASE
────────────────────────────────
1. Read RESUMEN-ARQUITECTURA.md (15 min)
2. Run validate-architecture.sh (5 min)
3. Review any violations found (30 min)
4. Study one example from "Doing It Right" section (20 min)

Result: You know what's working and what needs fixing


DAY 3: APPLY TO YOUR CODE
──────────────────────────
1. Before writing new code, check .instructions.md for pattern (5 min)
2. Write your code (varies)
3. Self-review against ARCHITECTURE-GUARDIAN-GUIDE.md checklist (15 min)
4. Run validate-architecture.sh (2 min)
5. Ask for code review (peer review with same framework)

Result: Your code follows all rules


ONGOING: CODE REVIEW PROCESS
──────────────────────────────
For each PR:
1. Run validate-architecture.sh (2 min)
2. Check red flags from ARCHITECTURE-GUARDIAN-GUIDE.md (5 min)
3. Use 6-step workflow from ARCHITECTURE-GUARDIAN-GUIDE.md (15 min)
4. Reference patterns from "Doing It Right" section (5 min)
5. Approve or request changes

Result: Consistent architecture across all code


═══════════════════════════════════════════════════════════════════════════════
🔍 WHAT TO READ FOR YOUR ROLE
═══════════════════════════════════════════════════════════════════════════════

IF YOU ARE A BACKEND DEVELOPER:
───────────────────────────────
Priority 1: .instructions.md (section: Backend Validation)
Priority 2: ARCHITECTURE-GUARDIAN-GUIDE.md (section: PATTERN 1 & 2)
Priority 3: ARQUITECTURA-COMPLETA.md (section: 3. Arquitectura de Capas)
Priority 4: Run validate-architecture.sh before every commit

Key Rules for You:
  ✅ Correct JWT type (User vs Device)
  ✅ deviceId always from JWT
  ✅ Business logic in @Service
  ✅ No hardcoded secrets
  ❌ Never use API keys


IF YOU ARE A FRONTEND DEVELOPER:
─────────────────────────────────
Priority 1: .instructions.md (section: Frontend Validation)
Priority 2: ARCHITECTURE-GUARDIAN-GUIDE.md (section: Using Bearer Token)
Priority 3: RESUMEN-ARQUITECTURA.md (visual overview)
Priority 4: Run validate-architecture.sh before every PR

Key Rules for You:
  ✅ Store JWT securely
  ✅ Send Bearer tokens in requests
  ✅ Refresh tokens before expiry
  ✅ Handle 401/403 errors
  ❌ Never hardcode API URLs


IF YOU ARE A FIRMWARE ENGINEER (ESP32):
─────────────────────────────────────────
Priority 1: .instructions.md (section: Hardware Validation)
Priority 2: ARCHITECTURE-GUARDIAN-GUIDE.md (section: PATTERN 3)
Priority 3: ARQUITECTURA-COMPLETA.md (section: 4. HARDWARE)
Priority 4: Run validate-architecture.sh before any release

Key Rules for You:
  ✅ Use Bearer tokens (deviceToken)
  ✅ HTTPS only (WiFiClientSecure)
  ✅ Generate readingId for each sensor reading
  ✅ Handle token expiration (401 responses)
  ❌ Never use API keys
  ❌ Never use HTTP


IF YOU ARE A DATABASE ADMIN:
──────────────────────────────
Priority 1: ARQUITECTURA-COMPLETA.md (section: 5. Base de Datos)
Priority 2: .instructions.md (section: Database Integrity)
Priority 3: validate-architecture.sh (database checks)
Priority 4: Keep migrations in database/migrations/

Key Rules for You:
  ✅ UNIQUE constraint on reading_id
  ✅ Foreign keys (device_id → devices)
  ✅ Indexes on search columns
  ✅ Encrypted secrets storage
  ❌ Never hardcode data


IF YOU ARE A PROJECT LEAD/ARCHITECT:
──────────────────────────────────────
Priority 1: ARQUITECTURA-COMPLETA.md (read entire)
Priority 2: .instructions.md (understand all rules)
Priority 3: ARCHITECTURE-GUARDIAN-GUIDE.md (understand workflow)
Priority 4: Run validate-architecture.sh in CI/CD pipeline

Key Activities:
  📋 Enforce rules in code reviews
  📊 Run validation on every PR
  📚 Update documentation as architecture evolves
  🎓 Teach team members using these files


═══════════════════════════════════════════════════════════════════════════════
🚀 USING validate-architecture.sh
═══════════════════════════════════════════════════════════════════════════════

MANUAL RUN
──────────
bash validate-architecture.sh

Output:
  ✅ Shows which checks pass
  ⚠️  Shows which need attention
  ❌ Shows which are critical violations

Exit codes:
  0 = All good, ready to deploy
  1 = Violations found, fix before deploying


IN CI/CD PIPELINE
──────────────────
Add to .github/workflows/validate.yml:

    - name: Validate Architecture
      run: bash validate-architecture.sh

Then:
  ✅ Pipeline passes only if validation passes
  ❌ Pipeline fails if violations found
  📊 Reports violations to PR comments


WHAT DOES IT CHECK?
────────────────────

Backend (Java/Spring):
  ✅ No X-BioSense-Key (API key antipattern)
  ✅ Bearer tokens used
  ✅ No hardcoded secrets
  ✅ Dependency Injection pattern
  ✅ Service layer exists

ESP32 Firmware:
  ✅ No X-BioSense-Key
  ✅ Bearer token usage
  ✅ HTTPS/TLS enabled
  ✅ readingId deduplication

Database:
  ✅ reading_id UNIQUE constraint
  ✅ device_id foreign key
  ✅ Indexes present

Frontend:
  ✅ TypeScript configured
  ✅ No hardcoded endpoints

TOTAL: 15 automated checks


═══════════════════════════════════════════════════════════════════════════════
📚 FILE RELATIONSHIPS
═══════════════════════════════════════════════════════════════════════════════

    .instructions.md
           ↓
      (defines rules)
           ↓
    ARCHITECTURE-GUARDIAN-GUIDE.md
           ↓
      (explains how to apply rules)
           ↓
    validate-architecture.sh
           ↓
      (automates rule checking)

    ↑
    ↓
    ARQUITECTURA-COMPLETA.md
           ↓
      (detailed implementation reference)
           ↓
    RESUMEN-ARQUITECTURA.md
           ↓
      (visual overview)


All files work together to:
  1. Define the architecture
  2. Enforce the rules
  3. Validate compliance
  4. Help developers understand it


═══════════════════════════════════════════════════════════════════════════════
🎓 LEARNING RESOURCES
═══════════════════════════════════════════════════════════════════════════════

TO LEARN JWT AUTHENTICATION:
────────────────────────────
File: .instructions.md
Section: "Core Rules" → "Authentication Model"

Example code:
File: ARCHITECTURE-GUARDIAN-GUIDE.md
Section: "PATTERN 1: Device Endpoint"


TO LEARN CLEAN ARCHITECTURE:
─────────────────────────────
File: ARQUITECTURA-COMPLETA.md
Sections: 3 (Layers) + 5 (Paradigms) + 6 (SOLID)

Visual overview:
File: RESUMEN-ARQUITECTURA.md


TO LEARN CODE REVIEW PROCESS:
──────────────────────────────
File: ARCHITECTURE-GUARDIAN-GUIDE.md
Section: "WORKFLOW: Code Review Step by Step" (6 steps)


TO LEARN RED FLAGS:
───────────────────
File: ARCHITECTURE-GUARDIAN-GUIDE.md
Section: "RED FLAGS: ALWAYS REJECT THESE" (7 examples)


TO LEARN BY EXAMPLE:
────────────────────
File: ARCHITECTURE-GUARDIAN-GUIDE.md
Section: "DOING IT RIGHT: Examples to Copy" (3 patterns)


═══════════════════════════════════════════════════════════════════════════════
⚡ QUICK ANSWERS
═══════════════════════════════════════════════════════════════════════════════

Q: "What file should I read first?"
A: Start with .instructions.md, then ARCHITECTURE-GUARDIAN-GUIDE.md

Q: "How do I know if my code is correct?"
A: Check against checklist in ARCHITECTURE-GUARDIAN-GUIDE.md, then run validate-architecture.sh

Q: "What's the most important rule?"
A: THREE SACRED RULES at end of .instructions.md

Q: "I found a violation, how do I fix it?"
A: See "DOING IT RIGHT" section in ARCHITECTURE-GUARDIAN-GUIDE.md for patterns

Q: "Can I violate a rule if I have a good reason?"
A: ONLY if documented and approved. Then plan refactor to fix it.

Q: "Where's the detailed architecture?"
A: ARQUITECTURA-COMPLETA.md has everything

Q: "I need a visual overview"
A: RESUMEN-ARQUITECTURA.md has ASCII diagrams

Q: "I need to teach this to my team"
A: Use ARCHITECTURE-GUARDIAN-GUIDE.md "Learning Path" (4-day course)

Q: "How do I integrate this into CI/CD?"
A: Add `bash validate-architecture.sh` to your workflow


═══════════════════════════════════════════════════════════════════════════════
🎯 SUCCESS CRITERIA
═══════════════════════════════════════════════════════════════════════════════

YOUR TEAM IS USING GUARDIAN SUCCESSFULLY WHEN:

  ✅ New code follows architectural rules automatically
  ✅ Code reviews reference .instructions.md
  ✅ validate-architecture.sh passes on every PR
  ✅ No API keys or hardcoded secrets in codebase
  ✅ JWT authentication used consistently
  ✅ Device flow implemented correctly everywhere
  ✅ Clean architecture maintained (layers)
  ✅ Developers can answer "why?" for each decision
  ✅ Zero security violations
  ✅ New developers onboard faster using these docs


═══════════════════════════════════════════════════════════════════════════════
📞 SUPPORT & QUESTIONS
═══════════════════════════════════════════════════════════════════════════════

QUESTION TYPE → FIND IN

"What rules apply to me?"
  → ARCHITECTURE-GUARDIAN-GUIDE.md: "What to Read for Your Role"

"How do I implement this pattern?"
  → ARCHITECTURE-GUARDIAN-GUIDE.md: "DOING IT RIGHT: Examples to Copy"

"Is this a violation?"
  → ARCHITECTURE-GUARDIAN-GUIDE.md: "RED FLAGS"

"What's the correct way?"
  → ARCHITECTURE-GUARDIAN-GUIDE.md: "QUICK REFERENCE: What's Correct?"

"How do I review code?"
  → ARCHITECTURE-GUARDIAN-GUIDE.md: "WORKFLOW: Code Review"

"What am I allowed to do?"
  → .instructions.md: "Core Rules"

"What does this component do?"
  → ARQUITECTURA-COMPLETA.md: "Componentes del Sistema"

"I need to validate my changes"
  → Run: bash validate-architecture.sh

"I don't understand the architecture"
  → Read in order: .instructions.md → RESUMEN-ARQUITECTURA.md → ARQUITECTURA-COMPLETA.md


═══════════════════════════════════════════════════════════════════════════════
🏆 FINAL NOTES
═══════════════════════════════════════════════════════════════════════════════

This Guardian system exists to:

1. SAVE TIME
   - Automate repetitive validation checks
   - Clear rules prevent back-and-forth reviews
   - New developers onboard faster

2. PREVENT BUGS
   - Consistent patterns reduce defects
   - Security violations caught early
   - Data integrity guaranteed

3. MAINTAIN QUALITY
   - All code follows same principles
   - Clean architecture enforced
   - SOLID principles applied

4. ENABLE SCALING
   - System grows without degrading
   - New components follow patterns
   - Easy to add features

5. DOCUMENT DECISIONS
   - Why was this designed this way?
   - Answer is in these files
   - Future developers understand context


REMEMBER: This is not bureaucracy, it's LIBERATION.

Clear rules → Faster development
Consistent patterns → Fewer bugs
Automation → More time for real work
Good architecture → Long-term sustainability


═══════════════════════════════════════════════════════════════════════════════

Document: System Architecture Guardian - Complete Index
Version: 1.0
Status: ✅ ACTIVE AND READY TO USE
Last Updated: 2024-04-20

GET STARTED: Read .instructions.md next (15 minutes)
