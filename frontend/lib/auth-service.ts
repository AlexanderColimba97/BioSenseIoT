import { Capacitor } from '@capacitor/core';
import { AuthResponse } from './types';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { API_V2_URL } from './api-config';

// Inicializar de forma segura solo en el cliente
if (typeof window !== 'undefined') {
  (GoogleAuth.initialize({
    clientId: '669903110693-3f1lt6ci39go17j1hsutaeabrt36utq0.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  }) as any).catch((err: any) => {
    console.warn('GoogleAuth no se pudo inicializar', err);
  });
}

// URL de producción configurable
// Almacenamiento de tokens
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry'
};

export class AuthService {
  private static tokenRefreshTimeout: NodeJS.Timeout | null = null;

  private static getJwtExpirationMs(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      const payload = JSON.parse(atob(padded));

      if (!payload || typeof payload.exp !== 'number') return null;
      return payload.exp * 1000;
    } catch {
      return null;
    }
  }

  private static readStoredValue(key: string): string | null {
    if (typeof window === 'undefined') return null;

    return localStorage.getItem(key) || sessionStorage.getItem(key);
  }

  private static writeStoredValue(key: string, value: string): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  }

  private static removeStoredValue(key: string): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  /**
   * Valida si el token actual está expirado
   * Con fallback robusto para Capacitor donde localStorage puede perder datos
   */
  static isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;
    
    const token = this.readStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    const expiry = this.readStoredValue(STORAGE_KEYS.TOKEN_EXPIRY);
    const storedAt = this.readStoredValue('TOKEN_STORED_AT');
    
    // Si no hay token, está expirado
    if (!token) return true;

    // Preferir exp del JWT si está disponible.
    const jwtExpiryMs = this.getJwtExpirationMs(token);
    if (jwtExpiryMs) {
      return Date.now() >= (jwtExpiryMs - 60000);
    }
    
    // Si hay token pero no hay expiración guardada
    if (!expiry) {
      // Si se guardó recientemente (hace menos de 30 min), asumir que es válido
      if (storedAt) {
        const elapsed = Date.now() - parseInt(storedAt, 10);
        if (elapsed < 1800000) { // 30 minutos
          console.log('[Auth] Usando token con fallback de tiempo');
          return false;
        }
      }
      // Si no se guardó recientemente, considerar expirado
      return true;
    }
    
    const expiryTime = parseInt(expiry, 10);
    const now = Date.now();
    
    // Considera expirado si faltan menos de 60 segundos para expirar
    // Solo si expiryTime es un número válido
    if (isNaN(expiryTime)) {
      return false; // fallback: si la fecha es inválida, no expirado
    }
    
    return now >= (expiryTime - 60000);
  }

  /**
   * Obtiene un token válido, refrescándolo si es necesario
   */
  static async getValidToken(): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Token no disponible en servidor');
    }

    const token = this.readStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!token) {
      throw new Error('No estás autenticado. Por favor inicia sesión nuevamente.');
    }

    // Si el token está expirado, intenta refrescarlo
    if (this.isTokenExpired()) {
      try {
        await this.refreshToken();
        const newToken = this.readStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
        if (!newToken) {
          throw new Error('No se pudo obtener nuevo token');
        }
        return newToken;
      } catch (error) {
        // Si falla el refresh, requiere login
        this.removeStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
        this.removeStoredValue(STORAGE_KEYS.REFRESH_TOKEN);
        this.removeStoredValue(STORAGE_KEYS.TOKEN_EXPIRY);
        this.removeStoredValue('TOKEN_STORED_AT');
        throw new Error('Tu sesión expiró. Por favor inicia sesión nuevamente.');
      }
    }

    return token;
  }

  /**
   * Refresca el token usando el refresh token
   */
  private static async refreshToken(): Promise<void> {
    const refreshToken = this.readStoredValue(STORAGE_KEYS.REFRESH_TOKEN);
    const accessToken = this.readStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!refreshToken && !accessToken) {
      console.warn('[Auth] No hay refresh token ni access token disponible');
      throw new Error('No hay token disponible para renovar la sesión');
    }

    try {
      console.log('[Auth] Intentando refrescar token...');
      const response = await fetch(`${API_V2_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: refreshToken || undefined,
          accessToken: accessToken || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Auth] Refresh fallido:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Refresh token inválido o expirado');
        }
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data: AuthResponse = await response.json();
      
      if (!data.accessToken) {
        console.error('[Auth] El servidor no devolvió accessToken');
        throw new Error('Respuesta inválida del servidor');
      }
      if (!data.refreshToken) {
        console.warn('[Auth] El servidor no devolvió refreshToken; se limpiará cualquier valor previo');
      }
      
      console.log('[Auth] Token refrescado exitosamente');
      this.storeTokens(data.accessToken, data.refreshToken);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[Auth] Error refrescando token:', msg);
      throw new Error(`No se pudo refrescar token: ${msg}`);
    }
  }

  /**
   * Fuerza un refresh de sesión y retorna el nuevo access token.
   * Útil cuando el backend responde 401 pero el token local aún parece válido.
   */
  static async refreshSession(): Promise<string> {
    await this.refreshToken();
    const token = this.readStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      throw new Error('No se pudo obtener nuevo token');
    }
    return token;
  }

  /**
   * Guarda los tokens con su tiempo de expiración
   */
  private static storeTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;

    try {
      this.removeStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
      this.removeStoredValue(STORAGE_KEYS.REFRESH_TOKEN);
      this.removeStoredValue(STORAGE_KEYS.TOKEN_EXPIRY);
      this.removeStoredValue('TOKEN_STORED_AT');

      this.writeStoredValue(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        this.writeStoredValue(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      // Calcular expiración (generalmente JWT expira en 1 hora)
      const expiryTime = Date.now() + 3600000; // 1 hora
      this.writeStoredValue(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      
      // Guardar marca de tiempo de cuando se almacenó (para Capacitor fallback)
      this.writeStoredValue('TOKEN_STORED_AT', Date.now().toString());

      console.log('[Auth] Tokens guardados exitosamente');
      
      // Verificar que se guardó correctamente
      const saved = this.readStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
      if (!saved) {
        console.warn('[Auth] ⚠️ Warning: Token no se guardó en localStorage!');
      }

      // Programar refresh automático 50 minutos después
      if (this.tokenRefreshTimeout) {
        clearTimeout(this.tokenRefreshTimeout);
      }
      this.tokenRefreshTimeout = setTimeout(() => {
        this.refreshToken().catch(() => {
          console.warn('Auto-refresh de token falló');
        });
      }, 3000000); // 50 minutos
    } catch (e) {
      console.error('[Auth] Error al guardar tokens:', e);
    }
  }

  static async loginWithGoogle(): Promise<AuthResponse> {
    try {
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication.idToken;
      
      if (!idToken) {
        throw new Error('No se recibió idToken de Google');
      }

      return await this.sendTokenToBackend(idToken);
    } catch (error: any) {
      console.error('Error GoogleAuth:', error);
      throw new Error(`Google Login Falló`);
    }
  }

  private static async sendTokenToBackend(idToken: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_V2_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data: AuthResponse = await response.json();
      this.storeTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Auth backend error: ${msg}`);
    }
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_V2_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Credenciales incorrectas');
      }

      const data: AuthResponse = await response.json();
      this.storeTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(msg);
    }
  }

  static async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_V2_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      if (!response.ok) {
        throw new Error('Error al registrar usuario');
      }

      const data: AuthResponse = await response.json();
      this.storeTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(msg);
    }
  }

  static logout(): void {
    if (typeof window === 'undefined') return;
    
    this.removeStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    this.removeStoredValue(STORAGE_KEYS.REFRESH_TOKEN);
    this.removeStoredValue(STORAGE_KEYS.TOKEN_EXPIRY);
    this.removeStoredValue('TOKEN_STORED_AT');
    
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }

    if (Capacitor.isNativePlatform()) {
      GoogleAuth.signOut();
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return this.readStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    }
    return null;
  }

  static isAuthenticated(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }
}
