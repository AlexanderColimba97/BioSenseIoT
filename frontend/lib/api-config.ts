/**
 * Configuración de URL base del API.
 *
 * En Capacitor y en dominios de producción usamos el backend remoto.
 * En desarrollo local seguimos apuntando a localhost.
 */

import { Capacitor } from '@capacitor/core';

const LOCAL_API_BASE_URL = 'http://localhost:8080';
const PRODUCTION_API_BASE_URL = 'https://biosenseiot-production-e061.up.railway.app';

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLocalUrl(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
}

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL ? normalizeUrl(process.env.NEXT_PUBLIC_API_URL) : '';

  if (typeof window === 'undefined') {
    return envUrl || PRODUCTION_API_BASE_URL;
  }

  const runtimeHost = window.location.hostname;
  const isLocalRuntime = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';
  const isNativeRuntime = Capacitor.isNativePlatform();

  if (isNativeRuntime) {
    return envUrl && !isLocalUrl(envUrl) ? envUrl : PRODUCTION_API_BASE_URL;
  }

  if (isLocalRuntime) {
    return envUrl && isLocalUrl(envUrl) ? envUrl : LOCAL_API_BASE_URL;
  }

  return envUrl && !isLocalUrl(envUrl) ? envUrl : PRODUCTION_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const API_V2_URL = `${API_BASE_URL}/api/v2`;

export const API_URL = `${API_BASE_URL}/api`;

export function buildApiV2Url(path: string): string {
  return `${API_V2_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildApiUrl(path: string): string {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}