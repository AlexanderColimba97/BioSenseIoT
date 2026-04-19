import { Capacitor } from '@capacitor/core';
import { AuthResponse } from './types';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

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
const BASE_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://biosenseiot-production-e061.up.railway.app').replace(/\/+$/, '');
const API_URL = `${BASE_API_URL}/api/v2`;

// Almacenamiento de tokens
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry'
};

export class AuthService {
  private static tokenRefreshTimeout: NodeJS.Timeout | null = null;

  /**
   * Valida si el token actual está expirado
   */
  static isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;
    
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiry) return true;
    
    const expiryTime = parseInt(expiry, 10);
    const now = Date.now();
    
    // Considera expirado si faltan menos de 60 segundos para expirar
    return now >= (expiryTime - 60000);
  }

  /**
   * Obtiene un token válido, refrescándolo si es necesario
   */
  static async getValidToken(): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Token no disponible en servidor');
    }

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!token) {
      throw new Error('No estás autenticado. Por favor inicia sesión nuevamente.');
    }

    // Si el token está expirado, intenta refrescarlo
    if (this.isTokenExpired()) {
      try {
        await this.refreshToken();
        const newToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!newToken) {
          throw new Error('No se pudo obtener nuevo token');
        }
        return newToken;
      } catch (error) {
        // Si falla el refresh, requiere login
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        throw new Error('Tu sesión expiró. Por favor inicia sesión nuevamente.');
      }
    }

    return token;
  }

  /**
   * Refresca el token usando el refresh token
   */
  private static async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Refresh token inválido o expirado');
        }
        throw new Error(`Error ${response.status}`);
      }

      const data: AuthResponse = await response.json();
      this.storeTokens(data.accessToken, data.refreshToken || refreshToken);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`No se pudo refrescar token: ${msg}`);
    }
  }

  /**
   * Guarda los tokens con su tiempo de expiración
   */
  private static storeTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }

    // Calcular expiración (generalmente JWT expira en 1 hora)
    const expiryTime = Date.now() + 3600000; // 1 hora
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

    // Programar refresh automático 50 minutos después
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }
    this.tokenRefreshTimeout = setTimeout(() => {
      this.refreshToken().catch(() => {
        console.warn('Auto-refresh de token falló');
      });
    }, 3000000); // 50 minutos
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
      const response = await fetch(`${API_URL}/auth/google`, {
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
      const response = await fetch(`${API_URL}/auth/login`, {
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
      const response = await fetch(`${API_URL}/auth/register`, {
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
    
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    
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
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
    return null;
  }

  static isAuthenticated(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }
}
