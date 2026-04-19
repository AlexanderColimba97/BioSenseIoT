import { AuthService } from './auth-service';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://biosenseiot-production-e061.up.railway.app').replace(/\/+$/, '')

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

export async function linkDevice(macAddress: string, deviceName: string): Promise<Device> {
  // Obtener token válido (refresca si es necesario)
  const token = await AuthService.getValidToken();

  if (!macAddress || !deviceName) {
    throw new Error('MAC Address y Nombre del dispositivo son requeridos');
  }

  try {
    const response = await retryFetch(`${API_URL}/api/v2/devices/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ macAddress, deviceName })
    });

    if (!response.ok) {
      let errorMsg = 'Error al vincular el dispositivo';
      
      if (response.status === 401) {
        throw new Error('Tu sesión expiró. Por favor inicia sesión nuevamente.');
      }
      
      try {
        const error = await response.json();
        errorMsg = error.error || error.message || errorMsg;
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
    const token = await AuthService.getValidToken();

    const response = await retryFetch(`${API_URL}/api/v2/devices/my-devices`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

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
    const token = await AuthService.getValidToken();
    
    const response = await retryFetch(
      `${API_URL}/api/v2/devices/${deviceId}/readings?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
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
    const token = await AuthService.getValidToken();
    
    const response = await retryFetch(`${API_URL}/api/v2/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Error al desvincular el dispositivo');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(msg);
  }
}
