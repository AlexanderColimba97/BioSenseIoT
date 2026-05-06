'use client'

import { useEffect, useMemo, useState } from 'react'
import { DiagnosticResponse } from '@/lib/types'
import { AuthService } from '@/lib/auth-service'
import { usePets } from './use-pets'
import { buildDefaultAlertWsUrl, buildLocalAlertIntelligence, fetchAlertAiAnalysis, mergeAlertIntelligence, type AlertIntelligenceReport, type AlertLike } from '@/lib/alert-intelligence'

interface UseAlertIntelligenceProps {
  alert: AlertLike | null | undefined
  diagnostic?: DiagnosticResponse | null
}

export interface UseAlertIntelligenceResult {
  report: AlertIntelligenceReport | null
  isLoading: boolean
  isRemoteAnalysisLoading: boolean
  source: 'local' | 'remote' | 'idle'
}

export function useAlertIntelligence({ alert, diagnostic }: UseAlertIntelligenceProps): UseAlertIntelligenceResult {
  const { pets } = usePets()
  const [report, setReport] = useState<AlertIntelligenceReport | null>(null)
  const [isRemoteAnalysisLoading, setIsRemoteAnalysisLoading] = useState(false)

  const currentUser = useMemo(() => AuthService.getCurrentUser(), [alert?.id, diagnostic?.timestamp, pets?.length])

  useEffect(() => {
    const baseReport = buildLocalAlertIntelligence({
      alert,
      currentUser,
      pets: pets || [],
      diagnostic
    })

    let cancelled = false
    setReport(baseReport)
    setIsRemoteAnalysisLoading(false)

    if (!alert || !AuthService.isAuthenticated()) {
      return () => {
        cancelled = true
      }
    }

    setIsRemoteAnalysisLoading(true)

    void fetchAlertAiAnalysis({
      user: currentUser,
      pets: pets || [],
      alert,
      diagnostic,
      localReport: baseReport
    })
      .then((remote) => {
        if (cancelled || !remote) return
        setReport(mergeAlertIntelligence(baseReport, remote))
      })
      .finally(() => {
        if (!cancelled) setIsRemoteAnalysisLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [alert, currentUser, diagnostic, pets])

  return {
    report,
    isLoading: !report,
    isRemoteAnalysisLoading,
    source: report?.source ?? 'idle'
  }
}

export function getAlertWsUrl(): string | null {
  return buildDefaultAlertWsUrl()
}