const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Device {
  id: number;
  name: string;
  macAddress: string;
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
  const response = await fetch(`${API_URL}/api/v2/devices/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ macAddress, deviceName })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to link device');
  }
  
  const data = await response.json();
  return {
    id: data.deviceId,
    name: data.name,
    macAddress: data.macAddress
  };
}

export async function getUserDevices(): Promise<Device[]> {
  const response = await fetch(`${API_URL}/api/v2/devices/my-devices`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) throw new Error('Failed to fetch devices');
  return response.json();
}

export async function getDeviceReadings(deviceId: number, limit = 100): Promise<SensorReading[]> {
  const response = await fetch(
    `${API_URL}/api/v2/devices/${deviceId}/readings?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );
  
  if (!response.ok) throw new Error('Failed to fetch readings');
  return response.json();
}

export async function unlinkDevice(deviceId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v2/devices/${deviceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) throw new Error('Failed to unlink device');
}