const DEFAULT_API_BASE_URL = 'https://biosenseiot-production-e061.up.railway.app';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

export const API_V2_URL = `${API_BASE_URL}/api/v2`;

export const API_URL = `${API_BASE_URL}/api`;

export function buildApiV2Url(path: string): string {
  return `${API_V2_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildApiUrl(path: string): string {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}