'use client'

import useSWR from 'swr'
import { PetProfile } from '@/lib/types'
import { AuthService } from '@/lib/auth-service'
import { API_V2_URL } from '@/lib/api-config'

export interface PetDiagnosticHistory {
  petId: number
  petName: string
  diagnosticsCount: number
  averageRiskScore: number
  trends: {
    timestamp: string
    riskLevel: 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'
    affectedSensors: string[]
  }[]
}

/**
 * Hook para obtener historial de diagnósticos por mascota
 * Útil para gráficos de tendencia
 */
export function usePetDiagnosticHistory(petId?: number) {
  const swrKey = AuthService.isAuthenticated() && petId 
    ? [`/pet/${petId}/history`] 
    : null

  const fetcher = async () => {
    if (!petId) return null
    
    // En producción, este endpoint retornaría desde el backend
    // Por ahora retornamos estructura vacía para no romper la compilación
    const mockHistory: PetDiagnosticHistory = {
      petId,
      petName: '',
      diagnosticsCount: 0,
      averageRiskScore: 0,
      trends: []
    }
    
    return mockHistory
  }

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    keepPreviousData: true,
  })

  return {
    history: data,
    isLoading,
    isError: !!error,
    error,
    refresh: () => mutate(),
  }
}

/**
 * Hook para obtener historial de múltiples mascotas
 */
export function usePetsHistoricalData(pets: PetProfile[] | undefined) {
  const histories = (pets || []).map(pet => usePetDiagnosticHistory(pet.id))

  return {
    allHistories: histories.map(h => h.history).filter(h => h !== null),
    isLoading: histories.some(h => h.isLoading),
    isError: histories.some(h => h.isError),
  }
}
