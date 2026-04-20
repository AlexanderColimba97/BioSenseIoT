#!/usr/bin/env bash
# 🏗️ Architecture Guardian - Automated Validation Script
# Enforces system consistency across all components
# Usage: ./validate-architecture.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VIOLATIONS=0
WARNINGS=0
APPROVED=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🏗️  BIOSENSEIOT - ARCHITECTURE GUARDIAN VALIDATION      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# 1. CHECK BACKEND - JAVA/SPRING
# ============================================================================
echo -e "${BLUE}1️⃣  BACKEND VALIDATION (Java/Spring)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check 1.1: No X-BioSense-Key usage
echo -n "  Checking X-BioSense-Key (API key antipattern)... "
if grep -r "X-BioSense-Key" backend/src --include="*.java" 2>/dev/null; then
    echo -e "${RED}❌ VIOLATION: X-BioSense-Key found${NC}"
    ((VIOLATIONS++))
else
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
fi

# Check 1.2: JWT Bearer tokens used
echo -n "  Checking Bearer token usage... "
if grep -r "Bearer" backend/src/main/java/com/biosense/iot/auth --include="*.java" 2>/dev/null | grep -q "Authorization.*Bearer"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${RED}❌ VIOLATION: Bearer tokens not found${NC}"
    ((VIOLATIONS++))
fi

# Check 1.3: No hardcoded secrets
echo -n "  Checking hardcoded secrets... "
if grep -r "private static.*String.*=" backend/src --include="*.java" | grep -iE "(secret|password|api.*key|token)"; then
    echo -e "${RED}❌ VIOLATION: Hardcoded secrets found${NC}"
    ((VIOLATIONS++))
else
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
fi

# Check 1.4: Dependency Injection pattern
echo -n "  Checking Dependency Injection... "
if grep -r "@Autowired\|@RequiredArgsConstructor" backend/src/main/java --include="*.java" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${YELLOW}⚠️  WARNING: DI pattern not clearly visible${NC}"
    ((WARNINGS++))
fi

# Check 1.5: Service layer exists
echo -n "  Checking service layer separation... "
if [ -d "backend/src/main/java/com/biosense/iot/auth/application" ] && \
   [ -d "backend/src/main/java/com/biosense/iot/device/application" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Application layer might be incomplete${NC}"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# 2. CHECK ESP32 FIRMWARE
# ============================================================================
echo -e "${BLUE}2️⃣  ESP32 FIRMWARE VALIDATION (C++)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check 2.1: No X-BioSense-Key in firmware
echo -n "  Checking X-BioSense-Key in firmware... "
if grep -r "X-BioSense-Key" hardware/esp32_biosense --include="*.ino" --include="*.cpp" 2>/dev/null; then
    echo -e "${RED}❌ VIOLATION: X-BioSense-Key found in firmware${NC}"
    ((VIOLATIONS++))
else
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
fi

# Check 2.2: Bearer token usage in firmware
echo -n "  Checking Bearer token in requests... "
if grep -r "Authorization.*Bearer" hardware/esp32_biosense --include="*.ino" 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Bearer token pattern not found${NC}"
    ((WARNINGS++))
fi

# Check 2.3: HTTPS usage
echo -n "  Checking HTTPS/TLS usage... "
if grep -r "WiFiClientSecure\|https://" hardware/esp32_biosense --include="*.ino" 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${YELLOW}⚠️  WARNING: HTTPS might not be configured${NC}"
    ((WARNINGS++))
fi

# Check 2.4: readingId generation
echo -n "  Checking readingId deduplication... "
if grep -r "readingId\|reading_id" hardware/esp32_biosense --include="*.ino" 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${YELLOW}⚠️  WARNING: readingId not found${NC}"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# 3. CHECK DATABASE
# ============================================================================
echo -e "${BLUE}3️⃣  DATABASE VALIDATION (PostgreSQL)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check 3.1: reading_id UNIQUE constraint
echo -n "  Checking reading_id UNIQUE constraint... "
if grep -r "reading_id.*UNIQUE\|UNIQUE.*reading_id" database/migrations --include="*.sql" 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${RED}❌ VIOLATION: UNIQUE constraint on reading_id not found${NC}"
    ((VIOLATIONS++))
fi

# Check 3.2: device_id foreign key
echo -n "  Checking device_id foreign key... "
if grep -r "FOREIGN KEY.*device_id\|device_id.*FOREIGN" database/migrations --include="*.sql" 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Foreign key relationship might be incomplete${NC}"
    ((WARNINGS++))
fi

# Check 3.3: Indexes on critical columns
echo -n "  Checking indexes (device_id, timestamp)... "
if grep -r "INDEX.*device_id\|INDEX.*timestamp" database/migrations --include="*.sql" 2>/dev/null | grep -q "INDEX"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Performance indexes might be missing${NC}"
    ((WARNINGS++))
fi

echo ""

# ============================================================================
# 4. CHECK FRONTEND
# ============================================================================
echo -e "${BLUE}4️⃣  FRONTEND VALIDATION (Next.js/React)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check 4.1: TypeScript files
echo -n "  Checking TypeScript usage... "
if [ -f "frontend/tsconfig.json" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
else
    echo -e "${YELLOW}⚠️  WARNING: TypeScript not configured${NC}"
    ((WARNINGS++))
fi

# Check 4.2: No hardcoded endpoints
echo -n "  Checking hardcoded API endpoints... "
if grep -r "http://\|https://" frontend/src --include="*.ts" --include="*.tsx" | grep -E "localhost|192\.168|hardcoded"; then
    echo -e "${YELLOW}⚠️  WARNING: Hardcoded endpoints found${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ PASS${NC}"
    ((APPROVED++))
fi

echo ""

# ============================================================================
# 5. SUMMARY
# ============================================================================
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 VALIDATION SUMMARY${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}✅ APPROVED:${NC}  $APPROVED checks"
echo -e "  ${YELLOW}⚠️  WARNINGS:${NC}  $WARNINGS checks"
echo -e "  ${RED}❌ VIOLATIONS:${NC} $VIOLATIONS checks"
echo ""

if [ $VIOLATIONS -gt 0 ]; then
    echo -e "${RED}🚨 CRITICAL: $VIOLATIONS violations found - DEPLOYMENT BLOCKED${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: $WARNINGS issues found - Review before deployment${NC}"
    exit 0
else
    echo -e "${GREEN}✅ VALIDATION PASSED - All checks OK${NC}"
    echo -e "${GREEN}🚀 Ready for deployment${NC}"
    exit 0
fi
