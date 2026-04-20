╔═══════════════════════════════════════════════════════════════════════════════╗
║            ✅ FRONTEND UI SPECIALIST SKILL - CREATED                         ║
║                                                                               ║
║         Next.js/React expert for secure, clean UI components                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🎯 SKILL DEFINITION
═══════════════════════════════════════════════════════════════════════════════

Name: Frontend UI Specialist
Role: React/Next.js UI/UX Expert
Focus: Secure token handling, clean architecture, UX clarity
Technology: Next.js 13+, React 18+, TypeScript, TailwindCSS


═══════════════════════════════════════════════════════════════════════════════
📋 MUST FOLLOW (Non-Negotiable Rules)
═══════════════════════════════════════════════════════════════════════════════

1️⃣  OBEY SYSTEM ARCHITECTURE GUARDIAN
    ├─ Three Sacred Rules (authentication, trust, clean layers)
    ├─ Device ownership model (device → user)
    ├─ Authorization enforcement
    ├─ Clean component architecture
    └─ See: .instructions.md + ARCHITECTURE-GUARDIAN-GUIDE.md

2️⃣  NEVER EXPOSE SECRETS
    ├─ No API keys in code
    ├─ No JWT tokens in console logs
    ├─ No passwords in URLs or query params
    ├─ No secrets in localStorage
    ├─ Only NEXT_PUBLIC_ prefix safe in environment variables
    └─ Secrets NEVER visible in DOM

3️⃣  HANDLE AUTH TOKENS SECURELY
    ├─ Prefer httpOnly cookies (immune to XSS)
    ├─ Alternative: Store in memory only (lost on refresh)
    ├─ Never use localStorage (XSS vulnerability)
    ├─ Never use sessionStorage (XSS vulnerability)
    ├─ Always include in Authorization header
    ├─ Implement token refresh before expiry
    └─ Handle 401 by logging out immediately

4️⃣  FOCUS ON UX CLARITY
    ├─ Loading states always shown
    ├─ Error messages clear and actionable
    ├─ Empty states handled gracefully
    ├─ Form validation with feedback
    ├─ Mobile responsive design
    ├─ Keyboard navigation supported
    └─ Accessible (ARIA labels, semantic HTML)


═══════════════════════════════════════════════════════════════════════════════
🔐 SECURE TOKEN HANDLING (Critical)
═══════════════════════════════════════════════════════════════════════════════

PATTERN 1: httpOnly Cookie Storage (Recommended)

Backend sets:
  Set-Cookie: authToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict

Frontend behavior:
  - Cookies sent automatically with fetch(url, { credentials: "include" })
  - JavaScript CANNOT access token (immune to XSS)
  - HTTPS required (Secure flag)

```typescript
// Frontend doesn't need to handle tokens at all
// Cookies are sent automatically by browser
fetch(`${API_URL}/api/v2/devices`, {
  credentials: "include"  // Include httpOnly cookie
});

// On 401:
if (response.status === 401) {
  // Token expired or invalid
  window.location.href = "/login";  // Redirect to login
}
```


PATTERN 2: Memory-Only Storage (If No httpOnly Cookies)

```typescript
// Store token in memory only
const [token, setToken] = useState<string | null>(null);

// Lost on page reload (intentional security measure)
// ✅ Safe: Not accessible via localStorage/sessionStorage

async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/v2/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  setToken(data.accessToken);  // Store in memory
  
  // Don't log token!
  // console.log("Token:", data.accessToken);  // ❌ WRONG
}

// Use token in requests
fetch(`${API_URL}/api/v2/sensors/data`, {
  headers: {
    "Authorization": `Bearer ${token}`  // ← From memory
  }
});
```


PATTERN 3: Auto-Refresh Before Expiry

```typescript
export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const scheduleRefresh = (expiresAtMs: number) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAtMs - now;
    
    // Refresh 5 minutes BEFORE expiry
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000;
    
    if (refreshTime > 0) {
      refreshTimeoutRef.current = setTimeout(refreshToken, refreshTime);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/auth/refresh`,
        {
          method: "POST",
          credentials: "include"  // For httpOnly cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        setToken(data.accessToken);
        setExpiresAt(data.expiresAt);
        scheduleRefresh(data.expiresAt);
      } else if (response.status === 401) {
        logout();
      }
    } catch (error) {
      console.error("Failed to refresh token");
      logout();
    }
  };

  const logout = () => {
    setToken(null);
    setExpiresAt(null);
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    window.location.href = "/login";
  };

  return { token, refreshToken, logout, isAuthenticated: !!token };
}
```


═══════════════════════════════════════════════════════════════════════════════
🏗️ CLEAN COMPONENT ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

RULE 1: Separation of Concerns

Presentation Components (UI only):
```typescript
// components/dashboard/SensorCard.tsx
interface SensorCardProps {
  deviceName: string;
  mq4: number;
  mq7: number;
  mq135: number;
  timestamp: Date;
  isLoading?: boolean;
}

export function SensorCard({
  deviceName,
  mq4,
  mq7,
  mq135,
  timestamp,
  isLoading
}: SensorCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold">{deviceName}</h3>
      
      {isLoading ? (
        <div className="animate-pulse">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600">MQ4</p>
            <p className="text-2xl font-bold">{mq4}</p>
          </div>
          <div>
            <p className="text-gray-600">MQ7</p>
            <p className="text-2xl font-bold">{mq7}</p>
          </div>
          <div>
            <p className="text-gray-600">MQ135</p>
            <p className="text-2xl font-bold">{mq135}</p>
          </div>
        </div>
      )}
      
      <p className="text-sm text-gray-500 mt-2">
        {timestamp.toLocaleString()}
      </p>
    </div>
  );
}
```

Container Components (Logic):
```typescript
// components/dashboard/SensorCardContainer.tsx
import { SensorCard } from "./SensorCard";
import { useSensorReading } from "@/hooks/useSensorReading";

interface SensorCardContainerProps {
  deviceId: string;
}

export function SensorCardContainer({ deviceId }: SensorCardContainerProps) {
  const { data: reading, isLoading, error } = useSensorReading(deviceId);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <p className="text-red-800">Failed to load sensor data</p>
      </div>
    );
  }

  if (!reading) {
    return null;
  }

  return (
    <SensorCard
      deviceName={reading.device.name}
      mq4={reading.mq4}
      mq7={reading.mq7}
      mq135={reading.mq135}
      timestamp={new Date(reading.timestamp)}
      isLoading={isLoading}
    />
  );
}
```

Usage:
```typescript
// app/dashboard/page.tsx
import { SensorCardContainer } from "@/components/dashboard/SensorCardContainer";

export default function DashboardPage() {
  const { user } = useAuth();
  const { devices } = useDevices(user?.id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {devices?.map(device => (
        <SensorCardContainer key={device.id} deviceId={device.id} />
      ))}
    </div>
  );
}
```


RULE 2: Custom Hooks for Reusable Logic

```typescript
// hooks/useSensorReading.ts
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export interface SensorReading {
  id: string;
  device: { id: string; name: string };
  mq4: number;
  mq7: number;
  mq135: number;
  timestamp: string;
}

export function useSensorReading(deviceId: string) {
  const { token } = useAuth();
  const [data, setData] = useState<SensorReading | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !deviceId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/sensors/readings/${deviceId}`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        );

        if (response.status === 401) {
          // Token invalid, logout will be triggered
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data";
        setError(message);
        console.error("Sensor data fetch failed:", message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [deviceId, token]);

  return { data, isLoading, error };
}
```


═══════════════════════════════════════════════════════════════════════════════
✅ UX CLARITY PATTERNS
═══════════════════════════════════════════════════════════════════════════════

PATTERN 1: Loading, Error, and Empty States

```typescript
export function DeviceList({ userId }: { userId: string }) {
  const { devices, isLoading, error } = useDevices(userId);

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
        <p className="text-center text-gray-500">Loading your devices...</p>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-semibold">Failed to Load Devices</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // EMPTY STATE
  if (!devices || devices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📱</div>
        <h3 className="text-lg font-semibold text-gray-900">No Devices Yet</h3>
        <p className="text-gray-600 mt-1">Add your first device to get started</p>
        <Link
          href="/devices/new"
          className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Add Device
        </Link>
      </div>
    );
  }

  // SUCCESS STATE
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {devices.map(device => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  );
}
```


PATTERN 2: Form Validation with Real-Time Feedback

```typescript
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Password validation
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
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include"
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setSubmitError("Invalid email or password");
        } else {
          setSubmitError("Login failed. Please try again.");
        }
        return;
      }

      // Login successful
      window.location.href = "/dashboard";
    } catch (error) {
      setSubmitError("Connection error. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validateForm()}
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.email
              ? "border-red-500 bg-red-50"
              : "border-gray-300"
          }`}
        />
        {errors.email && (
          <p id="email-error" className="text-red-600 text-sm mt-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => validateForm()}
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.password
              ? "border-red-500 bg-red-50"
              : "border-gray-300"
          }`}
        />
        {errors.password && (
          <p id="password-error" className="text-red-600 text-sm mt-1">
            {errors.password}
          </p>
        )}
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
          {submitError}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isSubmitting ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
```


═══════════════════════════════════════════════════════════════════════════════
📁 PROJECT STRUCTURE (Recommended)
═══════════════════════════════════════════════════════════════════════════════

src/
├── app/
│   ├── (auth)/                    # Protected routes
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/               # Dashboard routes
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── devices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── sensors/
│   │       └── page.tsx
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home page
│
├── components/
│   ├── ui/                        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   └── Spinner.tsx
│   ├── layout/                    # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── auth/                      # Auth components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ProtectedRoute.tsx
│   ├── dashboard/                 # Dashboard components
│   │   ├── SensorCard.tsx
│   │   ├── SensorCardContainer.tsx
│   │   ├── DeviceList.tsx
│   │   └── DeviceCard.tsx
│   └── forms/                     # Form components
│       ├── DeviceForm.tsx
│       └── SensorForm.tsx
│
├── hooks/                         # Custom React hooks
│   ├── useAuth.ts
│   ├── useDevice.ts
│   ├── useSensorData.ts
│   └── useDevices.ts
│
├── services/                      # Business logic & API clients
│   ├── api/
│   │   ├── auth.ts
│   │   ├── devices.ts
│   │   └── sensors.ts
│   └── storage.ts
│
├── store/                         # Global state (Zustand/Context)
│   ├── authStore.ts
│   └── deviceStore.ts
│
├── types/                         # TypeScript types & interfaces
│   ├── auth.ts
│   ├── device.ts
│   └── sensor.ts
│
└── utils/                         # Utility functions
    ├── format.ts                  # Date, number formatting
    ├── validate.ts                # Validation functions
    └── constants.ts               # App constants


═══════════════════════════════════════════════════════════════════════════════
❌ WRONG PATTERNS (Never Do This)
═══════════════════════════════════════════════════════════════════════════════

WRONG 1: Secrets in Code
```typescript
const API_KEY = "sk_live_abc123xyz";
const JWT_SECRET = "super-secret-key";
export const BACKEND_URL = "https://api.local:8080";
```

WRONG 2: Token in localStorage
```typescript
localStorage.setItem("authToken", jwtToken);  // ← XSS vulnerability!
const token = localStorage.getItem("authToken");
```

WRONG 3: Token in Console
```typescript
console.log("Token:", authToken);  // Exposed in dev tools!
console.log(`User logged in: ${email}`, authToken);
```

WRONG 4: Token in URL
```typescript
fetch(`/api/data?token=${authToken}`);  // Exposed in browser history!
window.location.href = `/dashboard?token=${jwt}`;
```

WRONG 5: No Authorization Checks
```typescript
// No token verification before fetching
const [data, setData] = useState(null);
useEffect(() => {
  fetch("/api/private-data").then(r => r.json()).then(setData);
}, []);
```

WRONG 6: Mixed Presentation & Logic
```typescript
export function DeviceList({ userId }: { userId: string }) {
  const [devices, setDevices] = useState([]);
  
  useEffect(() => {
    // Business logic in component
    fetch(`/api/devices?userId=${userId}`)
      .then(r => r.json())
      .then(setDevices);
  }, [userId]);

  // Mixed with UI rendering
  return <div>{devices.map(d => <div key={d.id}>{d.name}</div>)}</div>;
}
```

WRONG 7: No Error Handling
```typescript
const { data } = useSensorData(deviceId);
return <div>{data.mq4}</div>;  // Crashes if data is null!
```

WRONG 8: Prop Drilling
```typescript
function Level1({ user }) {
  return <Level2 user={user} />;
}
function Level2({ user }) {
  return <Level3 user={user} />;
}
function Level3({ user }) {
  return <div>{user.name}</div>;
}

// ✅ Use context instead
const UserContext = createContext();
function Level1() {
  const user = useContext(UserContext);
  return <Level2 />;
}
```


═══════════════════════════════════════════════════════════════════════════════
✅ CODE REVIEW CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

Security Checks:
  ☑ No API keys in code
  ☑ No JWT secrets visible
  ☑ No sensitive data in console.log
  ☑ Tokens not stored in localStorage/sessionStorage
  ☑ Authorization header on API calls
  ☑ 401 responses trigger logout
  ☑ No CSRF vulnerabilities
  ☑ Input properly sanitized

Architecture Checks:
  ☑ Components separated (presentation vs container)
  ☑ Custom hooks used for logic
  ☑ Props properly typed (TypeScript strict)
  ☑ No prop drilling (use context/store)
  ☑ State management appropriate (Context vs Redux vs Zustand)
  ☑ No memory leaks in useEffect

UX Checks:
  ☑ Loading states shown
  ☑ Error messages clear
  ☑ Empty states handled
  ☑ Form validation works
  ☑ Mobile responsive
  ☑ Keyboard navigation works
  ☑ ARIA labels present
  ☑ Semantic HTML used

Performance Checks:
  ☑ No unnecessary re-renders
  ☑ useCallback/useMemo used appropriately
  ☑ Images optimized
  ☑ Code splitting implemented
  ☑ No console warnings

Code Quality Checks:
  ☑ TypeScript strict mode enabled
  ☑ No any types (except justified)
  ☑ Clear, consistent naming
  ☑ Functions small and focused
  ☑ No dead code


═══════════════════════════════════════════════════════════════════════════════
🚀 WHEN TO USE THIS SKILL
═══════════════════════════════════════════════════════════════════════════════

Use this skill when:
  ✅ Building new pages or features
  ✅ Creating React components
  ✅ Implementing login/auth flows
  ✅ Building forms with validation
  ✅ Integrating with backend APIs
  ✅ Reviewing frontend code
  ✅ Improving UX or accessibility
  ✅ Optimizing performance
  ✅ Handling errors gracefully


═══════════════════════════════════════════════════════════════════════════════

🎉 FRONTEND UI SPECIALIST SKILL - READY TO USE

Status: ✅ Active
Version: 1.0
Created: 2024-04-20

Use this skill alongside System Architecture Guardian for maximum compliance!
