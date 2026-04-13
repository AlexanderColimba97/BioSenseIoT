'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { DiagnosticResponse } from '@/lib/types'
import { AuthService } from '@/lib/auth-service'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://biosenseiot-production-e061.up.railway.app').replace(/\/+$/, '')

// Datos estáticos de respaldo específicos para tus sensores MQ
const DEFAULT_DIAGNOSTIC: DiagnosticResponse = {
  diagnosticText: "Sistema en espera. Conecte su ESP32 para ver datos en tiempo real.",
  severity: "LOW",
  recommendation: "Asegúrese de que los sensores MQ estén precalentados.",
  timestamp: new Date().toISOString(),
  mq4: 0.0,   // Metano/Gas Natural
  mq7: 0.0,   // Monóxido de Carbono
  mq135: 0.0  // Calidad de Aire General
};

const fetcher = async (url: string) => {
  const token = AuthService.getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Error del servidor: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Error en fetcher:', error);
    throw error; // Relanzar para que SWR lo capture en 'error'
  }
}

export function useSensorData() {
  // Verificar si el dispositivo está activado
  const [isActivated, setIsActivated] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('device_activated') === 'true'
    }
    return false
  })
  
  // Cambia el refreshInterval basado en si está activado: 2-3 segundos si activado, 10 si no
  const refreshInterval = isActivated ? 2500 : 10000
  
  const { data, error, isLoading, mutate } = useSWR<DiagnosticResponse | null>(
    '/api/v2/diagnostics/latest',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: isActivated ? 1000 : 5000 // Evitar duplicados más agresivamente cuando está activado
    }
  )

  const safeData = data || DEFAULT_DIAGNOSTIC;
  const isFallback = !data && !isLoading;

  return {
    data: safeData,
    isLoading,
    isError: !!error,
    isFallback,
    error,
    refresh: mutate,
    isActivated
  }
}
