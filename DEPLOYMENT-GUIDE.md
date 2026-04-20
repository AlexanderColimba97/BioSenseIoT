# 🚀 DEPLOYMENT GUIDE - Auth Token Fix

## Quick Summary
✅ **Fixed:** Fresh user registration → sync button failing with "Tu sesión expiró" 
✅ **Cause:** Token persistence issue in mobile localStorage
✅ **Solution:** Intelligent token expiry fallback logic

## Files Modified
- `frontend/lib/auth-service.ts` - Token management improvements
- `frontend/lib/device-service.ts` - Logging improvements

## Deployment Steps

### Step 1: Deploy Frontend
```bash
cd frontend

# Build for production
npm run build

# Or for Capacitor mobile build
npm run build
npx cap sync  # For iOS/Android
```

### Step 2: Verify Backend (No Changes Needed)
The backend auth endpoints are already correctly implemented:
- ✅ `/api/v2/auth/register` 
- ✅ `/api/v2/auth/login`
- ✅ `/api/v2/auth/refresh`
- ✅ `/api/v2/auth/google`
- ✅ `/api/v2/devices/link`
- ✅ `SecurityConfig` with JWT validation

**No backend deployment needed** - all endpoints working correctly.

### Step 3: Verify Railway Configuration
In Railway dashboard, verify these environment variables are set:
```
JWT_SECRET=<your-secret-key-here>  # CRITICAL: Must be set
DATABASE_URL=<connection-string>
CORS_ALLOWED_ORIGINS=<your-frontend-url>
```

If JWT_SECRET is not set:
1. Go to Railway > BioSenseIoT > Variables
2. Add: `JWT_SECRET = <your-secret-key>`
3. Redeploy backend

### Step 4: Test Fresh Registration
After deployment:
1. Clear browser cache / app data
2. Create new test user
3. Check console logs for:
   - `[Auth] Tokens guardados exitosamente` ✅
4. Click sync button
5. Should NOT see "Tu sesión expiró" error
6. Device should register in database

### Step 5: Monitor Logs
In Railway dashboard:
```
# Look for these success patterns:
POST /api/v2/auth/register - 200 OK
POST /api/v2/devices/link - 200 OK

# Avoid these error patterns:
POST /api/v2/devices/link - 401 Unauthorized
POST /api/v2/auth/refresh - 401 Unauthorized
```

## Rollback Plan (If Issues)
If new code causes problems:

```bash
# Revert to previous version
git revert HEAD
npm run build
npm run deploy
```

## Expected Results

### Before Fix ❌
```
User registers → Sync fails immediately → "Tu sesión expiró" → Device not in DB
```

### After Fix ✅
```
User registers → Sync works → Device registers in DB → No auth errors
```

## Common Issues & Fixes

### Issue: Still getting "Tu sesión expiró"
**Check:**
1. Is JWT_SECRET configured in Railway?
2. Is frontend code deployed? (check version)
3. Clear browser cache completely
4. Check console for `[Auth]` logs

**Fix:**
```javascript
// In console, verify tokens:
localStorage.getItem('ACCESS_TOKEN')  // Should show JWT starting with "eyJ"
localStorage.getItem('TOKEN_STORED_AT')  // Should show timestamp
```

### Issue: Device still not in database
**Check:**
1. Did sync complete without error?
2. Check Railway database > Devices table
3. Check DeviceControllerV2 logs in Railway

**Debug:**
```bash
# Check database directly:
SELECT * FROM devices WHERE mac_address = '<your-device-mac>';
```

### Issue: 401 Unauthorized errors
**Check:**
1. JWT_SECRET is set and same everywhere
2. Token is being sent with "Bearer " prefix
3. Backend SecurityConfig is correct

**Verify:**
```bash
# Check JWT_SECRET in all places:
Railway variables → JWT_SECRET
application.properties → ${JWT_SECRET}
SecurityConfig → jwtSecret
JwtAdapter → secret
```

## Verification Checklist

- [ ] Frontend code pushed to repository
- [ ] Railway auto-deployed (if set to auto-deploy)
- [ ] JWT_SECRET environment variable verified
- [ ] Database connection verified
- [ ] New user registration tested
- [ ] Console shows `[Auth] Tokens guardados exitosamente`
- [ ] Sync button doesn't show session error
- [ ] Device appears in Railway database
- [ ] No 401 errors in Railway logs

## Performance Impact
- ⚠️ Minimal: Added 1 localStorage read operation
- ✅ Better: Reduced unnecessary refresh attempts
- ✅ Better: Improved error logging

## Security Notes
- No security changes
- Same JWT validation logic
- Same token expiry times (1 hour access, 7 days refresh)
- Token content unchanged

## Questions?
See detailed docs:
- `AUTH-TOKEN-FIX-SUMMARY.md` - Full technical details
- `AUTH-FIX-TESTING.md` - Complete test procedures
