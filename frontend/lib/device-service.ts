const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://biosenseiot-production-e061.up.railway.app').replace(/\/+$/, '')

function getAuthToken(): string {
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || ''
}

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

export async function linkDevice(macAddress: string, deviceName: string): Promise<Device> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No estás autenticado. Por favor inicia sesión nuevamente.');
  }

  const response = await fetch(`${API_URL}/api/v2/devices/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ macAddress, deviceName })
  });

  if (!response.ok) {
    let errorMsg = 'Error al vincular el dispositivo';
    try {
      const error = await response.json();
      errorMsg = error.error || error.message || errorMsg;
    } catch (parseErr) {
      console.warn('[device-service] Could not parse error response body:', parseErr);
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data.deviceId) {
    throw new Error('Respuesta inválida del servidor: falta el identificador del dispositivo');
  }

  console.log('[device-service] Dispositivo vinculado:', { deviceId: data.deviceId, name: data.name });

  return {
    id: data.deviceId,
    name: data.name || deviceName,
    macAddress: data.macAddress || macAddress,
    apiSecret: data.apiSecret
  };
}

export async function getUserDevices(): Promise<Device[]> {
  const token = getAuthToken();
  if (!token) return [];

  const response = await fetch(`${API_URL}/api/v2/devices/my-devices`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    throw new Error('Error al obtener la lista de dispositivos');
  }
  return response.json();
}

export async function getDeviceReadings(deviceId: number, limit = 100): Promise<SensorReading[]> {
  const response = await fetch(
    `${API_URL}/api/v2/devices/${deviceId}/readings?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  );

  if (!response.ok) throw new Error('Error al obtener las lecturas del dispositivo');
  return response.json();
}

export async function unlinkDevice(deviceId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v2/devices/${deviceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });

  if (!response.ok) throw new Error('Error al desvincular el dispositivo');
}
