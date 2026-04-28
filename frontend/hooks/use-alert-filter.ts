'use client'

import { useDiagnostics } from './use-diagnostics'
import { EnrichedAlert } from '@/lib/types'
import { useMemo } from 'react'

/**
 * Hook para filtrar y organizar alertas
 * Separa alertas críticas, de advertencia, etc.
 */
interface UseAlertFilterResult {
  criticalAlerts: EnrichedAlert[]
  warningAlerts: EnrichedAlert[]
  infoAlerts: EnrichedAlert[]
  totalAlerts: number
  hasCritical: boolean
  hasWarning: boolean
  allAlerts: EnrichedAlert[]
}

/**
 * Filtra y prioriza alertas del diagnóstico
 */
export function useAlertFilter(): UseAlertFilterResult {
  const { alert, diagnostic } = useDiagnostics()

  // Memoizar para evitar recálculos innecesarios
  const { criticalAlerts, warningAlerts, infoAlerts, allAlerts } = useMemo(() => {
    const alerts: EnrichedAlert[] = []

    // Agregar alerta actual si no está resuelta
    if (alert && !alert.resolved) {
      alerts.push(alert)
    }

    // Separar por severidad
    const critical = alerts.filter(
      (a) => a.severity === 'HIGH' || a.severity === 'CRITICAL'
    )
    const warning = alerts.filter(
      (a) => a.severity === 'MEDIUM'
    )
    const info = alerts.filter(
      (a) => a.severity === 'LOW'
    )

    return {
      criticalAlerts: critical,
      warningAlerts: warning,
      infoAlerts: info,
      allAlerts: alerts,
    }
  }, [alert, diagnostic])

  return {
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    totalAlerts: criticalAlerts.length + warningAlerts.length + infoAlerts.length,
    hasCritical: criticalAlerts.length > 0,
    hasWarning: warningAlerts.length > 0,
    allAlerts,
  }
}
