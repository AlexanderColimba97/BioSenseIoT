import { AuthService } from './auth-service';
import { API_V2_URL } from './api-config';

export interface Device {
  id: number;
  name: string;
  macAddress: string;
  apiSecret?: string;
}

export interface SensorReading {
  id: number;
  mq4: number;
  mq7: number;
  mq135: number;
  timestamp: string;
  airQualityState: 'CLEAN' | 'WARNING' | 'DANGER';
}

async function retryFetch(
  url: string,
  options: RequestInit,
  maxRetries: number = 2
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 30000)
        )
      ]);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('Network request failed');
}

async function fetchWithAuthRetry(url: string, options: RequestInit): Promise<Response> {
  let token = await AuthService.getValidToken();

  let response = await retryFetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status !== 401) {
    return response;
  }

  // Si el backend rechaza el token actual, forzar refresh y reintentar una vez.
  token = await AuthService.refreshSession();
  response = await retryFetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    }
  });

  return response;
}

export async function linkDevice(macAddress: string, deviceName: string): Promise<Device> {
  try {
    if (!macAddress || !deviceName) {
      throw new Error('MAC Address y Nombre del dispositivo son requeridos');
    }

    console.log('[Device] Vinculando dispositivo:', { macAddress, deviceName });

    const response = await fetchWithAuthRetry(`${API_V2_URL}/devices/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ macAddress, deviceName })
    });

    if (!response.ok) {
      let errorMsg = 'Error al vincular el dispositivo';
      
      if (response.status === 401) {
        console.error('[Device] Error 401: Token inválido o expirado');
        throw new Error('Tu sesión expiró. Por favor inicia sesión nuevamente.');
      }
      
      try {
        const error = await response.json();
        errorMsg = error.error || error.message || error.status || errorMsg;
        if (typeof errorMsg === 'string' && errorMsg.toLowerCase().startsWith('error:')) {
          errorMsg = errorMsg.slice(6).trim();
        }
      } catch {
        errorMsg = `Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    
    // Validar campos requeridos
    if (!data.deviceId) {
      throw new Error('Respuesta del servidor inválida: falta deviceId');
    }
    
    if (!data.apiSecret) {
      throw new Error('Respuesta del servidor inválida: falta apiSecret');
    }

    return {
      id: data.deviceId,
      name: data.name || deviceName,
      macAddress: data.macAddress || macAddress,
      apiSecret: data.apiSecret
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(msg);
  }
}

export async function getUserDevices(): Promise<Device[]> {
  try {
    const response = await fetchWithAuthRetry(`${API_V2_URL}/devices/my-devices`, {});

    if (!response.ok) {
      if (response.status === 401) throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      throw new Error('Error al obtener dispositivos');
    }
    
    return response.json();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(msg);
  }
}

export async function getDeviceReadings(deviceId: number, limit = 100): Promise<SensorReading[]> {
  try {
    const response = await fetchWithAuthRetry(
      `${API_V2_URL}/devices/${deviceId}/readings?limit=${limit}`,
      {}
    );

    if (!response.ok) throw new Error('Error al obtener las lecturas');
    return response.json();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(msg);
  }
}

export async function unlinkDevice(deviceId: number): Promise<void> {
  try {
    const response = await fetchWithAuthRetry(`${API_V2_URL}/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {}
    });

    if (!response.ok) throw new Error('Error al desvincular el dispositivo');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(msg);
  }
}
