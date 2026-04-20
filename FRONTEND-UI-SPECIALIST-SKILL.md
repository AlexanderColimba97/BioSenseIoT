# 🎨 Frontend UI Specialist Skill

> Next.js/React UI expert for BioSenseIoT  
> Enforcing secure token handling, clean architecture, and exceptional UX

---

## 🎯 Role Definition

**Specialist**: Frontend UI/UX Developer

**Expertise**:
- React 18+ with hooks
- Next.js 13+ App Router
- TypeScript for type safety
- Secure token management
- Responsive UI design
- Component composition
- State management (Zustand/Context)
- API integration

**Responsibility**: Build secure, performant, user-friendly interfaces

---

## 📋 MUST FOLLOW (Non-Negotiable)

### 1. Obey System Architecture Guardian

Every frontend change MUST comply with:
- **Three Sacred Rules** from `.instructions.md`
- **Clean component architecture** (presentation vs. logic)
- **Security best practices** (no secrets exposed)
- **Authorization enforcement** (show only authorized data)

See: `.instructions.md` + `ARCHITECTURE-GUARDIAN-GUIDE.md`

### 2. Never Expose Secrets

**Golden Rule**: Secrets (tokens, API keys, passwords) NEVER in code or DOM.

```tsx
// ❌ WRONG: Secrets in code
export const API_KEY = "sk_live_abc123";
export const JWT_SECRET = "super-secret";

// ✅ CORRECT: Use environment variables
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
// Note: NEXT_PUBLIC_ prefix means it's safe (no secrets!)

// ❌ WRONG: Secret in component
export function Login() {
  return (
    <div>
      {/* Secret visible in DOM! */}
      <input value="jwt_token_abc123" readOnly />
    </div>
  );
}

// ✅ CORRECT: No secrets in DOM
export function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      {/* No tokens visible */}
    </div>
  );
}

// ❌ WRONG: Token in console logs
console.log("Token:", authToken);  // ← Token exposed in dev tools!

// ✅ CORRECT: Log only non-sensitive info
console.log("Auth status: authenticated");
```

**Environment Variables Setup**:

```typescript
// .env.local (NEVER committed)
NEXT_PUBLIC_API_URL=https://api.biosense.com
NEXT_PUBLIC_APP_NAME=BioSenseIoT

// ❌ WRONG: Secret in env
NEXT_PUBLIC_JWT_SECRET=super-secret

// ✅ CORRECT: Secrets only on server if needed
// Not used in frontend at all
```

### 3. Handle Auth Tokens Securely

**Token Storage Strategy**:

```typescript
// ✅ CORRECT: Store JWT in secure httpOnly cookie (preferred)
// Backend sets: Set-Cookie: authToken=jwt; HttpOnly; Secure; SameSite=Strict

// ✅ ACCEPTABLE: Store in memory for frontend-only auth
// Lost on page reload (intentional for security)
const [token, setToken] = useState<string | null>(null);

// ❌ WRONG: Store in localStorage
localStorage.setItem("authToken", jwtToken);  // ← XSS vulnerability!

// ❌ WRONG: Store in sessionStorage
sessionStorage.setItem("authToken", jwtToken);  // ← Still accessible via JS

// ❌ WRONG: Store in state at root level
// (Too easy to expose via props drilling)
```

**Token Usage**:

```typescript
// ✅ CORRECT: Include in request headers
async function fetchSensorData(deviceId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/sensors/readings/${deviceId}`,
    {
      headers: {
        // Token sent in Authorization header (httpOnly cookie handles this)
        // OR
        "Authorization": `Bearer ${token}`  // Only if stored in memory
      }
    }
  );
  return response.json();
}

// ❌ WRONG: Token in URL
fetch(`${url}?token=${authToken}`);  // ← Exposed in browser history!

// ❌ WRONG: Token as body parameter
fetch(url, {
  body: JSON.stringify({ token: authToken, ... })  // ← Logged by servers
});
```

**Token Refresh Handling**:

```typescript
// ✅ CORRECT: Auto-refresh tokens
export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const refreshToken = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/auth/refresh`,
        { 
          method: "POST",
          credentials: "include"  // Include httpOnly cookie
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setToken(data.accessToken);
        setExpiresAt(data.expiresAt);
        
        // Schedule refresh 5 minutes before expiry
        scheduleRefresh(data.expiresAt);
      } else if (response.status === 401) {
        // Token invalid - logout
        logout();
      }
    } catch (error) {
      console.error("Token refresh failed");
      logout();
    }
  };

  const scheduleRefresh = (expiresAt: number) => {
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000;  // 5 min before
    
    setTimeout(refreshToken, Math.max(refreshTime, 0));
  };

  return { token, refreshToken, isAuthenticated: !!token };
}

// ✅ CORRECT: Handle 401 in API client
export const apiClient = (token: string) => {
  return async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      // Token expired or invalid
      // Trigger refresh or logout
      store.dispatch(logout());
      window.location.href = "/login";
    }

    return response;
  };
};
```

---

## 🏗️ Clean Component Architecture

### 1. Separate Concerns

```typescript
// ✅ CORRECT: Presentation component (pure)
interface SensorCardProps {
  deviceName: string;
  mq4: number;
  mq7: number;
  mq135: number;
  timestamp: Date;
}

export function SensorCard({ 
  deviceName, 
  mq4, 
  mq7, 
  mq135, 
  timestamp 
}: SensorCardProps) {
  return (
    <div className="sensor-card">
      <h3>{deviceName}</h3>
      <div className="readings">
        <div>MQ4: {mq4}</div>
        <div>MQ7: {mq7}</div>
        <div>MQ135: {mq135}</div>
      </div>
      <p className="timestamp">{timestamp.toLocaleString()}</p>
    </div>
  );
}

// ✅ CORRECT: Container component (logic)
export function SensorCardContainer({ deviceId }: { deviceId: string }) {
  const { data: reading, isLoading, error } = useSensorReading(deviceId);

  if (isLoading) return <SensorCardSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!reading) return null;

  return (
    <SensorCard
      deviceName={reading.device.name}
      mq4={reading.mq4}
      mq7={reading.mq7}
      mq135={reading.mq135}
      timestamp={new Date(reading.timestamp)}
    />
  );
}

// ❌ WRONG: Mixed concerns
export function SensorCard({ deviceId }: { deviceId: string }) {
  const [reading, setReading] = useState(null);
  
  useEffect(() => {
    // Business logic in presentation component
    fetch(`/api/sensors/${deviceId}`).then(r => r.json()).then(setReading);
  }, [deviceId]);

  return <div>{reading?.mq4}</div>;  // Tightly coupled
}
```

### 2. Use Custom Hooks for Logic

```typescript
// ✅ CORRECT: Custom hook for sensor data
export function useSensorReading(deviceId: string) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/sensors/readings/${deviceId}`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (response.status === 401) {
          throw new Error("Unauthorized");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [deviceId]);

  return { data, isLoading, error };
}

// ✅ CORRECT: Use hook in component
export function MyComponent({ deviceId }: { deviceId: string }) {
  const { data, isLoading, error } = useSensorReading(deviceId);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error} />;
  
  return <SensorDisplay reading={data} />;
}
```

### 3. Component Structure

```typescript
// ✅ CORRECT: Logical file structure
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── devices/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   └── layout.tsx
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── forms/
│   │   ├── LoginForm.tsx
│   │   └── DeviceForm.tsx
│   └── dashboard/
│       ├── SensorCard.tsx
│       └── DeviceList.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useSensorData.ts
│   └── useDevice.ts
│
├── services/
│   ├── api/
│   │   ├── auth.ts
│   │   ├── devices.ts
│   │   └── sensors.ts
│   └── storage.ts
│
├── store/
│   ├── authStore.ts
│   └── deviceStore.ts
│
├── types/
│   ├── auth.ts
│   ├── device.ts
│   └── sensor.ts
│
└── utils/
    ├── format.ts
    ├── validate.ts
    └── constants.ts
```

---

## ✅ UX Clarity Best Practices

### 1. Loading States

```typescript
// ✅ CORRECT: Show loading feedback
export function DeviceList({ userId }: { userId: string }) {
  const { devices, isLoading, error } = useDevices(userId);

  if (isLoading) {
    return (
      <div className="loading">
        <Spinner />
        <p>Loading your devices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <AlertIcon />
        <p>Failed to load devices</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="empty-state">
        <EmptyIcon />
        <p>No devices yet. Add one to get started.</p>
        <Link href="/devices/new">Add Device</Link>
      </div>
    );
  }

  return (
    <div className="device-grid">
      {devices.map(device => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  );
}
```

### 2. Error Handling with Context

```typescript
// ✅ CORRECT: Clear error messages
export function SensorData({ deviceId }: { deviceId: string }) {
  const { data, error } = useSensorReading(deviceId);

  if (error === "Unauthorized") {
    return (
      <div className="error-message">
        <p>You don't have permission to view this device.</p>
        <Link href="/devices">Back to Devices</Link>
      </div>
    );
  }

  if (error === "Network Error") {
    return (
      <div className="error-message">
        <p>Unable to connect. Check your internet connection.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <p>Something went wrong. {error}</p>
      </div>
    );
  }

  return <SensorDisplay data={data} />;
}

// ❌ WRONG: Generic error
{error && <div>Error</div>}

// ❌ WRONG: Technical error exposed
{error && <div>{error.toString()}</div>}  // User sees stack trace!
```

### 3. Form Validation

```typescript
// ✅ CORRECT: Real-time validation with clear feedback
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (error) {
      setErrors({ form: "Login failed. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="error">{errors.email}</p>}
      </div>

      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
        />
        {errors.password && <p className="error">{errors.password}</p>}
      </div>

      {errors.form && <p className="error">{errors.form}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
```

---

## ✅ Code Review Checklist

Before approving frontend code:

SECURITY:
- [ ] No secrets in code or DOM
- [ ] No console.log of sensitive data
- [ ] Tokens handled securely (httpOnly or memory)
- [ ] API calls include Authorization header
- [ ] 401 responses trigger logout
- [ ] CSRF protection (SameSite cookies)
- [ ] XSS prevention (sanitization)

ARCHITECTURE:
- [ ] Components separated (presentation vs. container)
- [ ] Custom hooks for reusable logic
- [ ] Props properly typed (TypeScript)
- [ ] State management appropriate
- [ ] No prop drilling (use context/store)
- [ ] Clean component hierarchy

UX/CLARITY:
- [ ] Loading states shown
- [ ] Error messages clear and actionable
- [ ] Empty states handled
- [ ] Form validation with feedback
- [ ] Keyboard navigation works
- [ ] Mobile responsive
- [ ] Accessible (ARIA labels)

PERFORMANCE:
- [ ] No unnecessary re-renders
- [ ] useCallback/useMemo used where needed
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] No memory leaks in effects

CODE QUALITY:
- [ ] TypeScript strict mode
- [ ] No any types (except justified)
- [ ] Naming is clear and consistent
- [ ] Functions are small and focused
- [ ] No dead code


## 🚫 FORBIDDEN (Will Be Rejected)

### 1. Secrets in Code

```typescript
// ❌ WRONG
export const API_KEY = "sk_live_123456";
export const JWT_SECRET = "super-secret";
```

### 2. Insecure Token Storage

```typescript
// ❌ WRONG
localStorage.setItem("token", jwt);
sessionStorage.setItem("token", jwt);
window.authToken = jwt;
```

### 3. Token in URL/Console

```typescript
// ❌ WRONG
fetch(`/api/data?token=${jwt}`);  // Exposed in history!
console.log("Token:", jwt);  // Exposed in dev tools!
console.log(`Logged in as ${user.email}`, jwt);
```

### 4. No Authorization Checks

```typescript
// ❌ WRONG: No token verification
const [data, setData] = useState(null);

useEffect(() => {
  fetch("/api/devices").then(r => r.json()).then(setData);
}, []);

// ✅ CORRECT
const { token } = useAuth();
useEffect(() => {
  if (!token) return;  // Don't fetch if not authenticated
  
  fetch("/api/devices", {
    headers: { "Authorization": `Bearer ${token}` }
  }).then(r => r.json()).then(setData);
}, [token]);
```

### 5. No Error Handling

```typescript
// ❌ WRONG: No error state
const { data } = useSensorData(deviceId);
return <div>{data.mq4}</div>;  // Crashes if data is null!

// ✅ CORRECT
const { data, error, isLoading } = useSensorData(deviceId);
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage />;
return <div>{data?.mq4}</div>;
```

---

## 🚀 When to Use This Skill

Use this skill when:
- Building new pages or components
- Implementing authentication flows
- Creating forms and validation
- Integrating with APIs
- Reviewing frontend code
- Improving UX/accessibility

---

## 📚 Reference Materials

Guardian System:
- `.instructions.md` → Core architecture rules
- `ARCHITECTURE-GUARDIAN-GUIDE.md` → Patterns and workflows

Frontend Resources:
- Next.js documentation
- React Hooks documentation
- TypeScript best practices
- Web security (OWASP)

---

**Skill Status**: ✅ Active and Ready  
**Version**: 1.0  
**Created**: 2024-04-20  

Use alongside System Architecture Guardian for maximum compliance!
