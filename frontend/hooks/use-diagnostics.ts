'use client'

import useSWR from 'swr'
import { DiagnosticResponse, EnrichedAlert, Severity } from '@/lib/types'
import { getLatestDiagnostic, mapDiagnosticToAlert } from '@/lib/diagnostic-service'
import { usePets } from './use-pets'
import { AuthService } from '@/lib/auth-service'

/**
 * Hook para gestionar diagnósticos y alertas
 * Implementa polling automático para dados en tiempo real
 */
interface UseDiagnosticsResult {
  diagnostic: DiagnosticResponse | null | undefined
  alert: EnrichedAlert | null | undefined
  isLoading: boolean
  isError: boolean
  error: Error | undefined
  isCritical: boolean
  refresh: () => Promise<void>
  severity: Severity | null
}

/**
 * Obtiene diagnósticos en tiempo real con polling
 * @param pollInterval Intervalo de polling en ms (default: 10 segundos)
 */
export function useDiagnostics(pollInterval: number = 10000): UseDiagnosticsResult {
  // Obtener mascotas para enriquecer el diagnóstico
  const { pets } = usePets()

  // Clave única para SWR
  const swrKey = AuthService.isAuthenticated() ? ['/diagnostics/latest', 'current'] : null

  const fetcher = async () => {
    return await getLatestDiagnostic()
  }

  const { data: diagnostic, error, isLoading, mutate } = useSWR<
    DiagnosticResponse | null,
    Error
  >(swrKey, fetcher, {
    // Polling automático en intervalo especificado
    refreshInterval: pollInterval,
    // No revalidar al cambiar de tab (mejor UX para mobile)
    revalidateOnFocus: false,
    // Deduplicar dentro de 5 segundos
    dedupingInterval: 5000,
    // Mantener datos previos si hay error
    keepPreviousData: true,
  })

  /**
   * Enriquecer diagnóstico con contexto de mascotas
   * Transforma DiagnosticResponse → EnrichedAlert
   */
  const alert = diagnostic ? mapDiagnosticToAlert(diagnostic, pets || []) : undefined

  /**
   * Refrescar manualmente diagnóstico
   */
  const refresh = async () => {
    await mutate()
  }

  return {
    diagnostic,
    alert,
    isLoading,
    isError: !!error,
    error,
    // Si es HIGH o CRITICAL, es crítico
    isCritical: (diagnostic?.severity === 'HIGH' || diagnostic?.severity === 'CRITICAL') ?? false,
    refresh,
    severity: diagnostic?.severity as Severity || null,
  }
}
