'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { DiagnosticResponse } from '@/lib/types'
import { AuthService } from '@/lib/auth-service'
import { buildApiV2Url } from '@/lib/api-config'
import { getUserDevices } from '@/lib/device-service'

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
  const token = await AuthService.getValidToken();

  try {
    const res = await fetch(buildApiV2Url(url.replace(/^\/api\/v2/, '')), {
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
  const [isActivated, setIsActivated] = useState(false)

  useEffect(() => {
    let mounted = true

    const refreshActivationState = async () => {
      const localActivated = typeof window !== 'undefined' && localStorage.getItem('device_activated') === 'true'
      if (localActivated) {
        if (mounted) setIsActivated(true)
        return
      }

      try {
        const devices = await getUserDevices()
        const active = devices.length > 0
        if (typeof window !== 'undefined') {
          localStorage.setItem('device_activated', active ? 'true' : 'false')
          localStorage.setItem('device_status', active ? 'active' : 'inactive')
        }
        if (mounted) setIsActivated(active)
      } catch {
        if (mounted) setIsActivated(localActivated)
      }
    }

    refreshActivationState()

    const onSyncSuccess = () => {
      if (mounted) setIsActivated(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('biosense-device-sync-success', onSyncSuccess)
      window.addEventListener('focus', refreshActivationState)
    }

    return () => {
      mounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('biosense-device-sync-success', onSyncSuccess)
        window.removeEventListener('focus', refreshActivationState)
      }
    }
  }, [])
  
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
